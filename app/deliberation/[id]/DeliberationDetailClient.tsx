'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MeetingNotes from '@/components/MeetingNotes'
import { useToast } from '@/components/Toast'

type Vote = {
  oduserId: string
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
}

export default function DeliberationDetailClient({
  application,
  userId,
  userName,
}: {
  application: Application
  userId: string
  userName: string
}) {
  const [isEditingDeliberation, setIsEditingDeliberation] = useState(false)
  const [ideaSummary, setIdeaSummary] = useState(application.deliberation?.idea_summary || '')
  const [thoughts, setThoughts] = useState(application.deliberation?.thoughts || '')
  const [decision, setDecision] = useState(application.deliberation?.decision || 'pending')
  const [status, setStatus] = useState(application.deliberation?.status || 'scheduled')
  const [meetingDate, setMeetingDate] = useState(application.deliberation?.meeting_date || '')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  const handleSaveDeliberation = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.from('deliberations').upsert(
        {
          application_id: application.id,
          idea_summary: ideaSummary || null,
          thoughts: thoughts || null,
          decision,
          status,
          meeting_date: meetingDate || null,
        },
        { onConflict: 'application_id' }
      )

      if (error) {
        showToast('Error saving deliberation: ' + error.message, 'error')
      } else {
        showToast('Deliberation saved', 'success')
        setIsEditingDeliberation(false)
        router.refresh()
      }
    } catch (err) {
      showToast('An unexpected error occurred', 'error')
    }
    setLoading(false)
  }

  const getVoteBadgeStyle = (vote: string) => {
    switch (vote) {
      case 'yes':
        return 'badge-success'
      case 'maybe':
        return 'badge-warning'
      case 'no':
        return 'badge-danger'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getDecisionBadgeStyle = (decision: string) => {
    switch (decision) {
      case 'yes':
        return 'bg-emerald-500 text-white'
      case 'no':
        return 'bg-red-500 text-white'
      case 'maybe':
        return 'bg-amber-500 text-white'
      default:
        return 'bg-gray-200 text-gray-700'
    }
  }

  const yesVotes = application.votes.filter((v) => v.vote === 'yes').length
  const maybeVotes = application.votes.filter((v) => v.vote === 'maybe').length
  const noVotes = application.votes.filter((v) => v.vote === 'no').length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/deliberation"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Deliberation
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-gray-900">{application.company_name}</h1>
              {application.deliberation?.decision && (
                <span className={`badge ${getDecisionBadgeStyle(application.deliberation.decision)}`}>
                  {application.deliberation.decision.toUpperCase()}
                </span>
              )}
            </div>
            {application.founder_names && (
              <p className="text-gray-500 mt-1 text-lg">{application.founder_names}</p>
            )}
          </div>

          {/* Vote Summary */}
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg">
              <span className="text-emerald-600 font-semibold text-lg">{yesVotes}</span>
              <span className="text-emerald-500">Yes</span>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-lg">
              <span className="text-amber-600 font-semibold text-lg">{maybeVotes}</span>
              <span className="text-amber-500">Maybe</span>
            </div>
            <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg">
              <span className="text-red-600 font-semibold text-lg">{noVotes}</span>
              <span className="text-red-500">No</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {application.company_description && (
          <p className="text-gray-600 mt-4">{application.company_description}</p>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-3 mt-4">
          {application.website && (
            <a
              href={application.website.startsWith('http') ? application.website : `https://${application.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>🌐</span> Website
            </a>
          )}
          {application.deck_link && (
            <a
              href={application.deck_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>📊</span> Deck
            </a>
          )}
          {application.primary_email && (
            <a
              href={`mailto:${application.primary_email}`}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>📧</span> {application.primary_email}
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Votes and Deliberation */}
        <div className="lg:col-span-1 space-y-6">
          {/* Partner Votes */}
          {application.votes.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Partner Votes</h2>
              <div className="space-y-3">
                {application.votes.map((vote) => (
                  <div key={vote.oduserId} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {vote.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{vote.userName}</p>
                      </div>
                      <span className={`badge ${getVoteBadgeStyle(vote.vote)}`}>{vote.vote}</span>
                    </div>
                    {vote.notes && <p className="text-sm text-gray-600 mt-2">{vote.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deliberation Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Deliberation</h2>
              <button
                onClick={() => setIsEditingDeliberation(!isEditingDeliberation)}
                className="btn btn-secondary text-sm"
              >
                {isEditingDeliberation ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {isEditingDeliberation ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Date</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                    <option value="scheduled">Scheduled</option>
                    <option value="met">Met</option>
                    <option value="emailed">Emailed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Idea Summary</label>
                  <textarea
                    value={ideaSummary}
                    onChange={(e) => setIdeaSummary(e.target.value)}
                    rows={2}
                    className="input resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thoughts</label>
                  <textarea
                    value={thoughts}
                    onChange={(e) => setThoughts(e.target.value)}
                    rows={3}
                    className="input resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                  <div className="flex gap-2">
                    {['pending', 'yes', 'maybe', 'no'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setDecision(opt)}
                        className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                          decision === opt
                            ? opt === 'yes'
                              ? 'bg-emerald-500 text-white'
                              : opt === 'no'
                              ? 'bg-red-500 text-white'
                              : opt === 'maybe'
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleSaveDeliberation} disabled={loading} className="btn btn-primary w-full">
                  {loading ? 'Saving...' : 'Save Deliberation'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {application.deliberation?.idea_summary && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Summary</p>
                    <p className="text-gray-900">{application.deliberation.idea_summary}</p>
                  </div>
                )}
                {!application.deliberation?.idea_summary && (
                  <p className="text-gray-500 italic">No summary yet. Click Edit to add one.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Meeting Notes */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Meeting Notes</h2>
                <p className="text-sm text-gray-500">Collaborate with your team in real-time</p>
              </div>
            </div>

            <MeetingNotes
              applicationId={application.id}
              userId={userId}
              userName={userName}
              deliberationNotes={application.deliberation?.thoughts}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
