'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
  company_description: string | null
  website: string | null
  deck_link: string | null
  submitted_at: string
  votes: Vote[]
  deliberation: Deliberation
}

export default function DeliberationClient({
  applications,
  userId,
}: {
  applications: Application[]
  userId: string
}) {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [ideaSummary, setIdeaSummary] = useState('')
  const [thoughts, setThoughts] = useState('')
  const [decision, setDecision] = useState('pending')
  const [status, setStatus] = useState('scheduled')
  const [meetingDate, setMeetingDate] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const openDeliberationModal = (app: Application) => {
    setSelectedApp(app)
    setIdeaSummary(app.deliberation?.idea_summary || '')
    setThoughts(app.deliberation?.thoughts || '')
    setDecision(app.deliberation?.decision || 'pending')
    setStatus(app.deliberation?.status || 'scheduled')
    setMeetingDate(app.deliberation?.meeting_date || '')
  }

  const handleSaveDeliberation = async () => {
    if (!selectedApp) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('deliberations')
        .upsert({
          application_id: selectedApp.id,
          idea_summary: ideaSummary || null,
          thoughts: thoughts || null,
          decision,
          status,
          meeting_date: meetingDate || null,
        }, {
          onConflict: 'application_id'
        })

      if (error) {
        alert('Error saving deliberation: ' + error.message)
        setLoading(false)
        return
      }

      // Update application stage based on decision
      if (decision === 'yes' && status === 'invested') {
        await supabase
          .from('applications')
          .update({ stage: 'invested' })
          .eq('id', selectedApp.id)
      } else if (decision === 'no' || status === 'rejected') {
        await supabase
          .from('applications')
          .update({ stage: 'rejected' })
          .eq('id', selectedApp.id)
      }

      setSelectedApp(null)
      router.refresh()
    } catch (err) {
      alert('An unexpected error occurred')
    }

    setLoading(false)
  }

  const getVoteColor = (vote: string) => {
    switch (vote) {
      case 'yes':
        return 'text-green-700 bg-green-100'
      case 'maybe':
        return 'text-yellow-700 bg-yellow-100'
      case 'no':
        return 'text-red-700 bg-red-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Deliberation</h2>
        <p className="text-gray-600">Applications with revealed votes awaiting final decision</p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No applications in deliberation
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map((app) => {
            const yesVotes = app.votes.filter((v) => v.vote === 'yes').length
            const maybeVotes = app.votes.filter((v) => v.vote === 'maybe').length
            const noVotes = app.votes.filter((v) => v.vote === 'no').length

            return (
              <div
                key={app.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {app.company_name}
                    </h3>
                    {app.founder_names && (
                      <p className="text-sm text-gray-600">{app.founder_names}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      {yesVotes} Yes
                    </span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                      {maybeVotes} Maybe
                    </span>
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      {noVotes} No
                    </span>
                  </div>
                </div>

                {app.company_description && (
                  <p className="text-gray-700 mb-4">{app.company_description}</p>
                )}

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Partner Votes:</h4>
                  <div className="space-y-2">
                    {app.votes.map((vote) => (
                      <div key={vote.userId} className="flex items-start gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getVoteColor(vote.vote)}`}>
                          {vote.vote}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{vote.userName}</p>
                          {vote.notes && (
                            <p className="text-sm text-gray-600">{vote.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {app.deliberation && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Deliberation Notes:</h4>
                    {app.deliberation.idea_summary && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-700">Summary:</p>
                        <p className="text-sm text-gray-900">{app.deliberation.idea_summary}</p>
                      </div>
                    )}
                    {app.deliberation.thoughts && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-700">Thoughts:</p>
                        <p className="text-sm text-gray-900">{app.deliberation.thoughts}</p>
                      </div>
                    )}
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-700">
                        <strong>Decision:</strong> {app.deliberation.decision}
                      </span>
                      <span className="text-gray-700">
                        <strong>Status:</strong> {app.deliberation.status}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  {app.website && (
                    <a
                      href={app.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Website →
                    </a>
                  )}
                  {app.deck_link && (
                    <a
                      href={app.deck_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Pitch Deck →
                    </a>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => openDeliberationModal(app)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add/Edit Deliberation
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Deliberation: {selectedApp.company_name}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Date
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Idea Summary
                  </label>
                  <textarea
                    value={ideaSummary}
                    onChange={(e) => setIdeaSummary(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief summary of the company's idea..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thoughts & Notes
                  </label>
                  <textarea
                    value={thoughts}
                    onChange={(e) => setThoughts(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Discussion notes, concerns, opportunities..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decision
                  </label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="yes">Yes</option>
                    <option value="maybe">Maybe</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="met">Met</option>
                    <option value="emailed">Emailed</option>
                    <option value="invested">Invested</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDeliberation}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Deliberation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
