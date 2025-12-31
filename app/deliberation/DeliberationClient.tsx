'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ApplicationDetailModal from '@/components/ApplicationDetailModal'
import { useToast } from '@/components/Toast'

type Vote = {
  userId: string
  userName: string
  vote: string
  notes: string | null
}

type Deliberation = {
  id: string
  meeting_date: string | null
  idea_summary: string | null
  thoughts: string | null
  decision: string
  status: string
} | null

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
  stage: string
  votes: Vote[]
  deliberation: Deliberation
  email_sent: boolean | null
  email_sender_name: string | null
}

type SortOption = 'date-newest' | 'date-oldest' | 'name-az' | 'name-za' | 'decision-yes' | 'decision-no'

export default function DeliberationClient({
  undecidedApplications,
  decidedApplications,
  userId,
}: {
  undecidedApplications: Application[]
  decidedApplications: Application[]
  userId: string
}) {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [detailApp, setDetailApp] = useState<Application | null>(null)
  const [ideaSummary, setIdeaSummary] = useState('')
  const [thoughts, setThoughts] = useState('')
  const [decision, setDecision] = useState('pending')
  const [status, setStatus] = useState('scheduled')
  const [meetingDate, setMeetingDate] = useState('')
  const [loading, setLoading] = useState(false)

  // Investment fields (shown when decision is 'yes')
  const [investmentAmount, setInvestmentAmount] = useState<number | null>(null)
  const [investmentTerms, setInvestmentTerms] = useState('')
  const [investmentDate, setInvestmentDate] = useState('')
  const [otherFunders, setOtherFunders] = useState('')

  // Search and sort for decided applications
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('date-newest')

  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  // Filter and sort decided applications
  const filteredDecidedApplications = useMemo(() => {
    let filtered = decidedApplications

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
        case 'decision-yes':
          // Yes first, then no
          if (a.deliberation?.decision === 'yes' && b.deliberation?.decision !== 'yes') return -1
          if (a.deliberation?.decision !== 'yes' && b.deliberation?.decision === 'yes') return 1
          return 0
        case 'decision-no':
          // No first, then yes
          if (a.deliberation?.decision === 'no' && b.deliberation?.decision !== 'no') return -1
          if (a.deliberation?.decision !== 'no' && b.deliberation?.decision === 'no') return 1
          return 0
        default:
          return 0
      }
    })

    return sorted
  }, [decidedApplications, searchQuery, sortOption])

  const openDeliberationModal = (app: Application) => {
    setSelectedApp(app)
    setIdeaSummary(app.deliberation?.idea_summary || '')
    setThoughts(app.deliberation?.thoughts || '')
    setDecision(app.deliberation?.decision || 'pending')
    setStatus(app.deliberation?.status || 'scheduled')
    setMeetingDate(app.deliberation?.meeting_date || '')
    // Reset investment fields
    setInvestmentAmount(null)
    setInvestmentTerms('10mm cap safe') // Default terms
    setInvestmentDate(new Date().toISOString().split('T')[0]) // Default to today
    setOtherFunders('')
  }

  const handleSaveDeliberation = async () => {
    if (!selectedApp) return

    // Validate investment fields if decision is 'yes'
    if (decision === 'yes') {
      if (!investmentAmount || investmentAmount <= 0) {
        showToast('Please enter an investment amount', 'warning')
        return
      }
      if (!investmentTerms) {
        showToast('Please enter investment terms', 'warning')
        return
      }
      if (!investmentDate) {
        showToast('Please enter an investment date', 'warning')
        return
      }
    }

    setLoading(true)

    try {
      // Save deliberation
      const { error } = await supabase
        .from('saifcrm_deliberations')
        .upsert({
          application_id: selectedApp.id,
          idea_summary: ideaSummary || null,
          thoughts: thoughts || null,
          decision,
          status: decision === 'yes' ? 'invested' : status,
          meeting_date: meetingDate || null,
        }, {
          onConflict: 'application_id'
        })

      if (error) {
        showToast('Error saving deliberation: ' + error.message, 'error')
        setLoading(false)
        return
      }

      // If decision is 'yes', create investment record and update application stage
      if (decision === 'yes') {
        // Create investment record
        const { error: investmentError } = await supabase
          .from('saifcrm_investments')
          .insert({
            company_name: selectedApp.company_name,
            investment_date: investmentDate,
            amount: investmentAmount,
            terms: investmentTerms,
            other_funders: otherFunders || null,
            founders: selectedApp.founder_names,
            description: ideaSummary || selectedApp.company_description,
            website: selectedApp.website,
            contact_email: selectedApp.primary_email,
            contact_name: null,
            stealthy: false,
            notes: thoughts || null,
          })

        if (investmentError) {
          showToast('Error creating investment: ' + investmentError.message, 'error')
          setLoading(false)
          return
        }

        // Update application stage to invested
        await supabase
          .from('saifcrm_applications')
          .update({ stage: 'invested' })
          .eq('id', selectedApp.id)
      } else if (decision === 'no') {
        // Update application stage to rejected
        await supabase
          .from('saifcrm_applications')
          .update({ stage: 'rejected' })
          .eq('id', selectedApp.id)
      }

      setSelectedApp(null)

      // Show appropriate success message based on decision
      if (decision === 'yes') {
        showToast('Investment recorded and added to portfolio', 'success')
      } else if (decision === 'no') {
        showToast('Application marked as rejected', 'success')
      } else {
        showToast('Deliberation saved', 'success')
      }

      router.refresh()
    } catch (err) {
      showToast('An unexpected error occurred', 'error')
    }

    setLoading(false)
  }

  const getVoteBadgeStyle = (vote: string) => {
    switch (vote) {
      case 'yes': return 'badge-success'
      case 'maybe': return 'badge-warning'
      case 'no': return 'badge-danger'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getDecisionBadgeStyle = (decision: string) => {
    switch (decision) {
      case 'yes': return 'bg-emerald-500 text-white'
      case 'no': return 'bg-red-500 text-white'
      case 'maybe': return 'bg-amber-500 text-white'
      default: return 'bg-gray-200 text-gray-700'
    }
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'invested': return 'badge-success'
      case 'rejected': return 'badge-danger'
      case 'met': return 'badge-info'
      case 'emailed': return 'badge-purple'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const renderApplicationCard = (app: Application, showDecisionBadge: boolean = false) => {
    const yesVotes = app.votes.filter((v) => v.vote === 'yes').length
    const maybeVotes = app.votes.filter((v) => v.vote === 'maybe').length
    const noVotes = app.votes.filter((v) => v.vote === 'no').length

    return (
      <div
        key={app.id}
        id={`app-${app.id}`}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover cursor-pointer"
        onClick={() => setDetailApp(app)}
      >
        {/* Card Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-semibold text-gray-900">
                  {app.company_name}
                </h3>
                {showDecisionBadge && app.deliberation?.decision && (
                  <span className={`badge ${getDecisionBadgeStyle(app.deliberation.decision)}`}>
                    {app.deliberation.decision.toUpperCase()}
                  </span>
                )}
                {app.deliberation?.status && app.deliberation.status !== 'scheduled' && (
                  <span className={`badge ${getStatusBadgeStyle(app.deliberation.status)}`}>
                    {app.deliberation.status}
                  </span>
                )}
                {app.email_sent ? (
                  <span className="badge text-xs bg-blue-100 text-blue-700">
                    Email Sent
                  </span>
                ) : app.email_sender_name && (
                  <span className="badge text-xs bg-purple-100 text-purple-700">
                    {app.email_sender_name} sending
                  </span>
                )}
              </div>
              {app.founder_names && (
                <p className="text-gray-500 mt-1">{app.founder_names}</p>
              )}
            </div>

            {/* Vote Summary */}
            <div className="flex gap-2 flex-shrink-0 ml-4">
              <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg">
                <span className="text-emerald-600 font-semibold">{yesVotes}</span>
                <span className="text-emerald-500 text-sm">Yes</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg">
                <span className="text-amber-600 font-semibold">{maybeVotes}</span>
                <span className="text-amber-500 text-sm">Maybe</span>
              </div>
              <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg">
                <span className="text-red-600 font-semibold">{noVotes}</span>
                <span className="text-red-500 text-sm">No</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          {app.company_description && (
            <p className="text-gray-600 mb-6 line-clamp-3">{app.company_description}</p>
          )}

          {/* Deliberation Notes if exists */}
          {app.deliberation && (app.deliberation.idea_summary || app.deliberation.thoughts) && (
            <div className="bg-[#f5f5f5] rounded-xl p-4 mb-6">
              <h4 className="text-sm font-medium text-[#4a4a4a] uppercase tracking-wide mb-3">
                Deliberation Notes
              </h4>
              {app.deliberation.idea_summary && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-[#4a4a4a]">Summary</p>
                  <p className="text-[#1a1a1a] line-clamp-2">{app.deliberation.idea_summary}</p>
                </div>
              )}
              {app.deliberation.thoughts && (
                <div>
                  <p className="text-sm font-medium text-[#4a4a4a]">Thoughts</p>
                  <p className="text-[#1a1a1a] line-clamp-2">{app.deliberation.thoughts}</p>
                </div>
              )}
            </div>
          )}

          {/* Partner Votes */}
          {app.votes.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Partner Votes
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {app.votes.map((vote) => (
                  <div key={vote.userId} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {vote.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{vote.userName}</p>
                      </div>
                      <span className={`badge ${getVoteBadgeStyle(vote.vote)}`}>
                        {vote.vote}
                      </span>
                    </div>
                    {vote.notes && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{vote.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-3">
            {app.website && (
              <a
                href={app.website.startsWith('http') ? app.website : `https://${app.website}`}
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
        </div>

        {/* Card Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <Link
            href={`/deliberation/${app.id}`}
            onClick={(e) => e.stopPropagation()}
            className="btn btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Meeting Notes
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation()
              openDeliberationModal(app)
            }}
            className="btn btn-primary"
          >
            {app.deliberation ? 'Edit Deliberation' : 'Add Deliberation'}
          </button>
        </div>
      </div>
    )
  }

  const totalCount = undecidedApplications.length + decidedApplications.length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Deliberation</h1>
            <p className="mt-1 text-gray-500">
              {totalCount} application{totalCount !== 1 ? 's' : ''} in deliberation
            </p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-lg">
              <span className="text-amber-600 font-medium">{undecidedApplications.length}</span>
              <span className="text-amber-500">needs decision</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
              <span className="text-gray-600 font-medium">{decidedApplications.length}</span>
              <span className="text-gray-500">decided</span>
            </div>
          </div>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🤝</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications in deliberation</h3>
          <p className="text-gray-500">Applications will appear here once votes are revealed.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Needs Decision Section */}
          {undecidedApplications.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-amber-100 rounded-lg">
                  <span className="text-amber-600 text-lg">⏳</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Needs Decision
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({undecidedApplications.length} application{undecidedApplications.length !== 1 ? 's' : ''} - newest first)
                  </span>
                </h2>
              </div>
              <div className="space-y-6">
                {undecidedApplications.map((app) => renderApplicationCard(app, false))}
              </div>
            </section>
          )}

          {/* Already Decided Section */}
          {decidedApplications.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-lg">
                  <span className="text-gray-600 text-lg">✓</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Already Decided
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({decidedApplications.length} application{decidedApplications.length !== 1 ? 's' : ''})
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
                      <option value="decision-yes">Yes Decisions First</option>
                      <option value="decision-no">No Decisions First</option>
                    </select>
                  </div>
                </div>
              </div>

              {filteredDecidedApplications.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                  <p className="text-gray-500">No applications match your search.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredDecidedApplications.map((app) => renderApplicationCard(app, true))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Application Detail Modal */}
      {detailApp && (
        <ApplicationDetailModal
          application={detailApp}
          onClose={() => setDetailApp(null)}
          actions={
            <button
              onClick={() => {
                setDetailApp(null)
                openDeliberationModal(detailApp)
              }}
              className="btn btn-primary"
            >
              {detailApp.deliberation ? 'Edit Deliberation' : 'Add Deliberation'}
            </button>
          }
        />
      )}

      {/* Deliberation Modal */}
      {selectedApp && (
        <div className="modal-backdrop" onClick={() => !loading && setSelectedApp(null)}>
          <div
            className="modal-content max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedApp.company_name}
                  </h2>
                  <p className="text-gray-500 mt-1">Add deliberation notes and final decision</p>
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
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Meeting Date
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="input"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="met">Met</option>
                    <option value="emailed">Emailed</option>
                    <option value="invested">Invested</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Idea Summary
                </label>
                <textarea
                  value={ideaSummary}
                  onChange={(e) => setIdeaSummary(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Brief summary of the company's idea..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Thoughts & Notes
                </label>
                <textarea
                  value={thoughts}
                  onChange={(e) => setThoughts(e.target.value)}
                  rows={4}
                  className="input resize-none"
                  placeholder="Discussion notes, concerns, opportunities..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Final Decision
                </label>
                <div className="flex gap-3">
                  {[
                    { value: 'pending', label: 'Pending', icon: '⏳', color: 'gray' },
                    { value: 'yes', label: 'Yes', icon: '✅', color: 'emerald' },
                    { value: 'maybe', label: 'Maybe', icon: '🤔', color: 'amber' },
                    { value: 'no', label: 'No', icon: '❌', color: 'red' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDecision(option.value)}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 font-semibold text-center transition-all ${
                        decision === option.value
                          ? option.color === 'emerald'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : option.color === 'amber'
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : option.color === 'red'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-400 bg-gray-50 text-gray-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-xl mb-1">{option.icon}</div>
                      <div>{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Investment Details - shown when decision is 'yes' */}
              {decision === 'yes' && (
                <div className="bg-emerald-50 rounded-xl p-6 border-2 border-emerald-200">
                  <h3 className="text-lg font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                    <span>💰</span> Investment Details
                  </h3>
                  <p className="text-sm text-emerald-700 mb-4">
                    Please enter the investment details. This will create a portfolio entry.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-1.5">
                        Investment Amount *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={investmentAmount || ''}
                          onChange={(e) => setInvestmentAmount(e.target.value ? parseFloat(e.target.value) : null)}
                          className="input pl-7"
                          placeholder="100000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-1.5">
                        Investment Date *
                      </label>
                      <input
                        type="date"
                        value={investmentDate}
                        onChange={(e) => setInvestmentDate(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-emerald-800 mb-1.5">
                      Terms *
                    </label>
                    <input
                      type="text"
                      value={investmentTerms}
                      onChange={(e) => setInvestmentTerms(e.target.value)}
                      onFocus={(e) => {
                        if (e.target.value === '10mm cap safe') {
                          setInvestmentTerms('')
                        }
                      }}
                      className="input"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-emerald-800 mb-1.5">
                      Co-Investors (optional)
                    </label>
                    <input
                      type="text"
                      value={otherFunders}
                      onChange={(e) => setOtherFunders(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setSelectedApp(null)}
                className="btn btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDeliberation}
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save Deliberation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
