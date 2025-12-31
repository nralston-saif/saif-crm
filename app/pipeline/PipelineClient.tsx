'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'

type Vote = {
  oduserId: string
  userName: string
  vote: string
  notes: string | null
}

type Application = {
  id: string
  company_name: string
  founder_names: string | null
  founder_linkedins: string | null
  founder_bios: string | null
  primary_email: string | null
  company_description: string | null
  website: string | null
  previous_funding: string | null
  deck_link: string | null
  submitted_at: string
  voteCount: number
  userVote?: string
  userNotes?: string
  votes_revealed: boolean
  allVotes: Vote[]
}

type OldApplication = {
  id: string
  company_name: string
  founder_names: string | null
  founder_linkedins: string | null
  founder_bios: string | null
  primary_email: string | null
  company_description: string | null
  website: string | null
  previous_funding: string | null
  deck_link: string | null
  stage: string
  submitted_at: string
}

type SortOption = 'date-newest' | 'date-oldest' | 'name-az' | 'name-za' | 'stage'

type Partner = {
  id: string
  name: string
}

type EmailSenderModal = {
  app: Application
  action: 'deliberation' | 'reject'
} | null

export default function PipelineClient({
  applications,
  oldApplications,
  userId,
  partners,
}: {
  applications: Application[]
  oldApplications: OldApplication[]
  userId: string
  partners: Partner[]
}) {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [detailApp, setDetailApp] = useState<Application | OldApplication | null>(null)
  const [vote, setVote] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [movingToDelib, setMovingToDelib] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmMoveApp, setConfirmMoveApp] = useState<Application | null>(null)

  // Email sender modal state
  const [emailSenderModal, setEmailSenderModal] = useState<EmailSenderModal>(null)
  const [selectedEmailSender, setSelectedEmailSender] = useState<string>('')

  // Search and sort state for old applications
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('date-newest')

  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  // Separate applications into sections
  const needsYourVote = applications.filter(app => !app.userVote)
  const alreadyVoted = applications.filter(app => app.userVote)

  // Filter and sort old applications
  const filteredOldApplications = useMemo(() => {
    let filtered = oldApplications

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(app =>
        app.company_name.toLowerCase().includes(query) ||
        (app.founder_names?.toLowerCase().includes(query)) ||
        (app.company_description?.toLowerCase().includes(query))
      )
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'date-newest':
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        case 'date-oldest':
          return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
        case 'name-az':
          return a.company_name.localeCompare(b.company_name)
        case 'name-za':
          return b.company_name.localeCompare(a.company_name)
        case 'stage':
          return a.stage.localeCompare(b.stage)
        default:
          return 0
      }
    })

    return sorted
  }, [oldApplications, searchQuery, sortOption])

  const handleVoteSubmit = async () => {
    if (!selectedApp || !vote) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('votes')
        .upsert({
          application_id: selectedApp.id,
          user_id: userId,
          vote_type: 'initial',
          vote,
          notes: notes || null,
        }, {
          onConflict: 'application_id,user_id,vote_type'
        })

      if (error) {
        showToast('Error submitting vote: ' + error.message, 'error')
        setLoading(false)
        return
      }

      // Update application stage to 'voting' if it was 'new'
      if (selectedApp.voteCount === 0) {
        await supabase
          .from('applications')
          .update({ stage: 'voting' })
          .eq('id', selectedApp.id)
      }

      setSelectedApp(null)
      setVote('')
      setNotes('')
      showToast('Vote submitted successfully', 'success')
      router.refresh()
    } catch (err) {
      showToast('An unexpected error occurred', 'error')
    }

    setLoading(false)
  }

  // Open email sender modal before moving to deliberation
  const promptMoveToDeliberation = (app: Application) => {
    setEmailSenderModal({ app, action: 'deliberation' })
    setSelectedEmailSender('')
  }

  // Open email sender modal before rejecting
  const promptReject = (app: Application) => {
    setEmailSenderModal({ app, action: 'reject' })
    setSelectedEmailSender('')
  }

  // Process the action after email sender is selected
  const handleEmailSenderConfirm = async () => {
    if (!emailSenderModal || !selectedEmailSender) return

    const { app, action } = emailSenderModal
    setMovingToDelib(app.id)

    try {
      const newStage = action === 'deliberation' ? 'deliberation' : 'rejected'

      const { error } = await supabase
        .from('applications')
        .update({
          stage: newStage,
          votes_revealed: true,
          email_sender_id: selectedEmailSender,
          email_sent: false,
        })
        .eq('id', app.id)

      if (error) {
        showToast(`Error: ${error.message}`, 'error')
        setMovingToDelib(null)
        return
      }

      const message = action === 'deliberation' ? 'Moved to deliberation' : 'Marked as rejected'
      showToast(message, 'success')
      setEmailSenderModal(null)
      router.refresh()
    } catch (err) {
      showToast('An unexpected error occurred', 'error')
    }

    setMovingToDelib(null)
  }

  const handleMoveToDeliberation = async (app: Application) => {
    setMovingToDelib(app.id)

    try {
      // Update application stage to deliberation and reveal votes
      const { error } = await supabase
        .from('applications')
        .update({
          stage: 'deliberation',
          votes_revealed: true
        })
        .eq('id', app.id)

      if (error) {
        showToast('Error moving to deliberation: ' + error.message, 'error')
        setMovingToDelib(null)
        return
      }

      showToast('Moved to deliberation', 'success')
      router.refresh()
    } catch (err) {
      showToast('An unexpected error occurred', 'error')
    }

    setMovingToDelib(null)
  }

  const handleMoveToDeliberationWithoutVoting = async () => {
    if (!confirmMoveApp) return

    setMovingToDelib(confirmMoveApp.id)

    try {
      // Update application stage to deliberation and reveal votes
      const { error } = await supabase
        .from('applications')
        .update({
          stage: 'deliberation',
          votes_revealed: true
        })
        .eq('id', confirmMoveApp.id)

      if (error) {
        showToast('Error moving to deliberation: ' + error.message, 'error')
        setMovingToDelib(null)
        setConfirmMoveApp(null)
        return
      }

      setConfirmMoveApp(null)
      setOpenMenuId(null)
      showToast('Moved to deliberation', 'success')
      router.refresh()
    } catch (err) {
      showToast('An unexpected error occurred', 'error')
    }

    setMovingToDelib(null)
  }

  const openVoteModal = (app: Application) => {
    setSelectedApp(app)
    setVote(app.userVote || '')
    setNotes(app.userNotes || '')
  }

  const getVoteButtonStyle = (option: string) => {
    const isSelected = vote === option
    const baseClasses = 'flex-1 py-4 px-4 rounded-xl border-2 font-semibold text-center transition-all cursor-pointer'

    if (isSelected) {
      if (option === 'yes') return `${baseClasses} border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md`
      if (option === 'maybe') return `${baseClasses} border-amber-500 bg-amber-50 text-amber-700 shadow-md`
      if (option === 'no') return `${baseClasses} border-red-500 bg-red-50 text-red-700 shadow-md`
    }
    return `${baseClasses} border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50`
  }

  const getVoteBadgeStyle = (voteValue: string) => {
    switch (voteValue) {
      case 'yes': return 'badge-success'
      case 'maybe': return 'badge-warning'
      case 'no': return 'badge-danger'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStageBadgeStyle = (stage: string) => {
    switch (stage) {
      case 'invested': return 'bg-emerald-100 text-emerald-700'
      case 'deliberation': return 'bg-amber-100 text-amber-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const renderApplicationCard = (app: Application, showFullVotes: boolean = false) => {
    const allVotesIn = app.voteCount >= 3
    const needsVote = !app.userVote

    return (
      <div
        key={app.id}
        id={`app-${app.id}`}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover cursor-pointer"
        onClick={() => setDetailApp(app)}
      >
        {/* Card Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {app.company_name}
              </h3>
              {app.founder_names && (
                <p className="text-sm text-gray-500 mt-0.5 truncate">{app.founder_names}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              {app.userVote && (
                <span className={`badge ${getVoteBadgeStyle(app.userVote)}`}>
                  Your vote: {app.userVote}
                </span>
              )}
              {needsVote && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(openMenuId === app.id ? null : app.id)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 16 16">
                      <circle cx="8" cy="2.5" r="1.5"/>
                      <circle cx="8" cy="8" r="1.5"/>
                      <circle cx="8" cy="13.5" r="1.5"/>
                    </svg>
                  </button>
                  {openMenuId === app.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenMenuId(null)
                        }}
                      />
                      <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(null)
                            setConfirmMoveApp(app)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Move to Deliberation without voting
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {app.company_description && (
            <p className="text-sm text-gray-600 line-clamp-3 mb-4">
              {app.company_description}
            </p>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-2 mb-4">
            {app.website && (
              <a
                href={app.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-[#1a1a1a] hover:text-black bg-[#f5f5f5] hover:bg-[#e5e5e5] px-3 py-1.5 rounded-lg transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <span>🌐</span> Website
              </a>
            )}
            {app.deck_link && (
              <a
                href={app.deck_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <span>📊</span> Deck
              </a>
            )}
          </div>

          {/* Vote Status - Show who has voted (but not how) until all votes are in */}
          {app.voteCount > 0 && !allVotesIn && (
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">{app.voteCount}/3</span> partners have voted
              </p>
              <div className="flex flex-wrap gap-2">
                {app.allVotes.map((v, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-sm bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                    <span className="w-2 h-2 bg-[#1a1a1a] rounded-full"></span>
                    {v.userName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Revealed Votes - Show when all 3 have voted */}
          {allVotesIn && (
            <div className="bg-emerald-50 rounded-xl p-4 mb-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-emerald-600">✓</span>
                <p className="text-sm font-medium text-emerald-800">All 3 partners have voted!</p>
              </div>
              <div className="grid gap-3">
                {app.allVotes.map((v, i) => (
                  <div key={i} className="bg-white rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-medium">
                          {v.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{v.userName}</p>
                      </div>
                      <span className={`badge ${getVoteBadgeStyle(v.vote)}`}>
                        {v.vote}
                      </span>
                    </div>
                    {v.notes && (
                      <p className="text-sm text-gray-600 mt-2 ml-11">{v.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Vote Progress */}
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full ${
                      i < app.voteCount ? 'bg-[#1a1a1a]' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {app.voteCount}/3 votes
              </span>
            </div>

            <div className="flex gap-2">
              {/* Vote/Edit Vote Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openVoteModal(app)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  app.userVote
                    ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                    : 'bg-[#1a1a1a] text-white hover:bg-black shadow-sm'
                }`}
              >
                {app.userVote ? 'Edit Vote' : 'Cast Vote'}
              </button>

              {/* Action buttons - only show when all 3 have voted */}
              {allVotesIn && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      promptReject(app)
                    }}
                    disabled={movingToDelib === app.id}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm transition-all disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      promptMoveToDeliberation(app)
                    }}
                    disabled={movingToDelib === app.id}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
                  >
                    {movingToDelib === app.id ? 'Moving...' : 'Move to Deliberation →'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderOldApplicationCard = (app: OldApplication) => {
    return (
      <div
        key={app.id}
        id={`app-${app.id}`}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setDetailApp(app)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{app.company_name}</h3>
            {app.founder_names && (
              <p className="text-sm text-gray-500 truncate">{app.founder_names}</p>
            )}
          </div>
          <span className={`badge ml-2 flex-shrink-0 capitalize ${getStageBadgeStyle(app.stage)}`}>
            {app.stage}
          </span>
        </div>
        {app.company_description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
            {app.company_description}
          </p>
        )}
        <p className="text-xs text-gray-400">
          Submitted {formatDate(app.submitted_at)}
        </p>
      </div>
    )
  }

  // Check if detailApp is an Application (has voteCount) or OldApplication
  const isNewApplication = (app: Application | OldApplication): app is Application => {
    return 'voteCount' in app
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pipeline</h1>
            <p className="mt-1 text-gray-500">
              {applications.length} application{applications.length !== 1 ? 's' : ''} in review
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#f5f5f5] px-4 py-2 rounded-lg">
            <span className="text-[#1a1a1a] font-medium">3 votes needed</span>
            <span className="text-[#666666]">to advance</span>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📭</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No new applications in pipeline</h3>
          <p className="text-gray-500">New applications will appear here when submitted via JotForm.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Needs Your Vote Section */}
          {needsYourVote.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-amber-100 rounded-lg">
                  <span className="text-amber-600 text-lg">⚡</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Needs Your Vote
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({needsYourVote.length} application{needsYourVote.length !== 1 ? 's' : ''})
                  </span>
                </h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {needsYourVote.map((app) => renderApplicationCard(app))}
              </div>
            </section>
          )}

          {/* Already Voted Section */}
          {alreadyVoted.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-lg">
                  <span className="text-emerald-600 text-lg">✓</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  You've Voted
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({alreadyVoted.length} application{alreadyVoted.length !== 1 ? 's' : ''})
                  </span>
                </h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {alreadyVoted.map((app) => renderApplicationCard(app, true))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Old Applications Section */}
      {oldApplications.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-lg">
              <span className="text-gray-600 text-lg">📁</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Past Applications
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({oldApplications.length} total)
              </span>
            </h2>
          </div>

          {/* Search and Sort Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by company, founder, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input !pl-11"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="sm:w-48">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="input"
                >
                  <option value="date-newest">Newest First</option>
                  <option value="date-oldest">Oldest First</option>
                  <option value="name-az">Name (A-Z)</option>
                  <option value="name-za">Name (Z-A)</option>
                  <option value="stage">By Stage</option>
                </select>
              </div>
            </div>
          </div>

          {/* Old Applications Grid */}
          {filteredOldApplications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <p className="text-gray-500">No applications match your search.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredOldApplications.map((app) => renderOldApplicationCard(app))}
            </div>
          )}
        </section>
      )}

      {/* Vote Modal */}
      {selectedApp && (
        <div className="modal-backdrop" onClick={() => !loading && setSelectedApp(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedApp.company_name}
                  </h2>
                  {selectedApp.founder_names && (
                    <p className="text-gray-500 mt-1">{selectedApp.founder_names}</p>
                  )}
                </div>
                <button
                  onClick={() => !loading && setSelectedApp(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 -m-2"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {selectedApp.company_description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    About
                  </h3>
                  <p className="text-gray-700">{selectedApp.company_description}</p>
                </div>
              )}

              {/* Links */}
              {(selectedApp.website || selectedApp.deck_link) && (
                <div className="flex gap-3">
                  {selectedApp.website && (
                    <a
                      href={selectedApp.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#1a1a1a] hover:text-black underline font-medium"
                    >
                      <span>🌐</span> Visit Website
                    </a>
                  )}
                  {selectedApp.deck_link && (
                    <a
                      href={selectedApp.deck_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                    >
                      <span>📊</span> View Deck
                    </a>
                  )}
                </div>
              )}

              {/* Vote Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Your Vote
                </h3>
                <div className="flex gap-3">
                  {['yes', 'maybe', 'no'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setVote(option)}
                      className={getVoteButtonStyle(option)}
                    >
                      <div className="text-2xl mb-1">
                        {option === 'yes' ? '👍' : option === 'maybe' ? '🤔' : '👎'}
                      </div>
                      <div className="capitalize">{option}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Share your thoughts on this application..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setSelectedApp(null)
                  setVote('')
                  setNotes('')
                }}
                className="btn btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleVoteSubmit}
                disabled={!vote || loading}
                className="btn btn-primary flex-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Vote'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Detail Modal */}
      {detailApp && (
        <div className="modal-backdrop" onClick={() => setDetailApp(null)}>
          <div
            className="modal-content max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {detailApp.company_name}
                    </h2>
                    {!isNewApplication(detailApp) && (
                      <span className={`badge capitalize ${getStageBadgeStyle(detailApp.stage)}`}>
                        {detailApp.stage}
                      </span>
                    )}
                  </div>
                  {detailApp.founder_names && (
                    <p className="text-gray-500 mt-1">{detailApp.founder_names}</p>
                  )}
                </div>
                <button
                  onClick={() => setDetailApp(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 -m-2"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Company Description */}
              {detailApp.company_description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Company Description
                  </h3>
                  <p className="text-gray-700">{detailApp.company_description}</p>
                </div>
              )}

              {/* Founder Bios */}
              {detailApp.founder_bios && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Founder Bios
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{detailApp.founder_bios}</p>
                </div>
              )}

              {/* Founder LinkedIns */}
              {detailApp.founder_linkedins && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Founder LinkedIn Profiles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {detailApp.founder_linkedins.split(/[\n,]+/).filter(Boolean).map((link, i) => {
                      const url = link.trim()
                      const isValidUrl = url.startsWith('http') || url.startsWith('linkedin')
                      const fullUrl = url.startsWith('http') ? url : `https://${url}`
                      return (
                        <a
                          key={i}
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-[#0077B5] hover:text-[#005582] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                          </svg>
                          LinkedIn {i + 1}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Contact Email */}
              {detailApp.primary_email && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Primary Email
                  </h3>
                  <a
                    href={`mailto:${detailApp.primary_email}`}
                    className="text-[#1a1a1a] hover:text-black underline"
                  >
                    {detailApp.primary_email}
                  </a>
                </div>
              )}

              {/* Website */}
              {detailApp.website && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Website
                  </h3>
                  <a
                    href={detailApp.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#1a1a1a] hover:text-black underline"
                  >
                    <span>🌐</span> {detailApp.website}
                  </a>
                </div>
              )}

              {/* Previous Funding */}
              {detailApp.previous_funding && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Previous Funding
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{detailApp.previous_funding}</p>
                </div>
              )}

              {/* Deck Link */}
              {detailApp.deck_link && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Pitch Deck / Additional Documents
                  </h3>
                  <a
                    href={detailApp.deck_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                  >
                    <span>📊</span> View Deck
                  </a>
                </div>
              )}

              {/* Submission Date */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Submission Date
                </h3>
                <p className="text-gray-700">{formatDate(detailApp.submitted_at)}</p>
              </div>

              {/* Vote information for new applications */}
              {isNewApplication(detailApp) && detailApp.allVotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Votes ({detailApp.voteCount}/3)
                  </h3>
                  <div className="grid gap-2">
                    {detailApp.allVotes.map((v, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">{v.userName}</span>
                        {detailApp.voteCount >= 3 ? (
                          <span className={`badge ${getVoteBadgeStyle(v.vote)}`}>
                            {v.vote}
                          </span>
                        ) : (
                          <span className="badge bg-gray-100 text-gray-600">Voted</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              {isNewApplication(detailApp) && (
                <button
                  onClick={() => {
                    setDetailApp(null)
                    openVoteModal(detailApp)
                  }}
                  className={`btn ${detailApp.userVote ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {detailApp.userVote ? 'Edit Vote' : 'Cast Vote'}
                </button>
              )}
              <button
                onClick={() => setDetailApp(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Moving to Deliberation Without Voting */}
      {confirmMoveApp && (
        <div className="modal-backdrop" onClick={() => !movingToDelib && setConfirmMoveApp(null)}>
          <div
            className="modal-content max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                Confirm Move to Deliberation
              </h2>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to move <span className="font-semibold">{confirmMoveApp.company_name}</span> to deliberation without completing all votes?
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setConfirmMoveApp(null)}
                className="btn btn-secondary flex-1"
                disabled={movingToDelib === confirmMoveApp.id}
              >
                Cancel
              </button>
              <button
                onClick={handleMoveToDeliberationWithoutVoting}
                disabled={movingToDelib === confirmMoveApp.id}
                className="btn btn-primary flex-1"
              >
                {movingToDelib === confirmMoveApp.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Moving...
                  </span>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Sender Modal */}
      {emailSenderModal && (
        <div className="modal-backdrop" onClick={() => !movingToDelib && setEmailSenderModal(null)}>
          <div
            className="modal-content max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {emailSenderModal.action === 'deliberation' ? 'Move to Deliberation' : 'Reject Application'}
              </h2>
              <p className="text-gray-500 mt-1">{emailSenderModal.app.company_name}</p>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Who is sending the email?
              </label>
              <select
                value={selectedEmailSender}
                onChange={(e) => setSelectedEmailSender(e.target.value)}
                className="input"
              >
                <option value="">Select a partner...</option>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setEmailSenderModal(null)}
                className="btn btn-secondary flex-1"
                disabled={movingToDelib === emailSenderModal.app.id}
              >
                Cancel
              </button>
              <button
                onClick={handleEmailSenderConfirm}
                disabled={!selectedEmailSender || movingToDelib === emailSenderModal.app.id}
                className={`btn flex-1 ${emailSenderModal.action === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : 'btn-primary'}`}
              >
                {movingToDelib === emailSenderModal.app.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : emailSenderModal.action === 'deliberation' ? (
                  'Move to Deliberation'
                ) : (
                  'Reject Application'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
