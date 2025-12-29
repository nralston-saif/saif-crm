'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Application = {
  id: string
  company_name: string
  founder_names: string | null
  company_description: string | null
  website: string | null
  deck_link: string | null
  submitted_at: string
  voteCount: number
  userVote?: string
  userNotes?: string
  votes_revealed: boolean
}

export default function PipelineClient({
  applications,
  userId,
}: {
  applications: Application[]
  userId: string
}) {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [vote, setVote] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
        alert('Error submitting vote: ' + error.message)
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
      router.refresh()
    } catch (err) {
      alert('An unexpected error occurred')
    }

    setLoading(false)
  }

  const openVoteModal = (app: Application) => {
    setSelectedApp(app)
    setVote(app.userVote || '')
    setNotes(app.userNotes || '')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Pipeline</h2>
        <p className="text-gray-600">New applications awaiting initial vote</p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No applications in pipeline
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {app.company_name}
                </h3>
                {app.founder_names && (
                  <p className="text-sm text-gray-600">{app.founder_names}</p>
                )}
              </div>

              {app.company_description && (
                <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                  {app.company_description}
                </p>
              )}

              <div className="space-y-2 mb-4">
                {app.website && (
                  <a
                    href={app.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline block"
                  >
                    Website →
                  </a>
                )}
                {app.deck_link && (
                  <a
                    href={app.deck_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline block"
                  >
                    Pitch Deck →
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  {app.voteCount}/3 votes
                </div>
                <button
                  onClick={() => openVoteModal(app)}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    app.userVote
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {app.userVote ? `Voted: ${app.userVote}` : 'Vote'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedApp.company_name}
              </h3>

              {selectedApp.founder_names && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700">Founders</p>
                  <p className="text-gray-900">{selectedApp.founder_names}</p>
                </div>
              )}

              {selectedApp.company_description && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700">Description</p>
                  <p className="text-gray-900">{selectedApp.company_description}</p>
                </div>
              )}

              <div className="mb-6 space-y-2">
                {selectedApp.website && (
                  <a
                    href={selectedApp.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    Website →
                  </a>
                )}
                {selectedApp.deck_link && (
                  <a
                    href={selectedApp.deck_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    Pitch Deck →
                  </a>
                )}
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Your Vote</p>
                <div className="flex gap-3">
                  {['yes', 'maybe', 'no'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setVote(option)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium capitalize transition-colors ${
                        vote === option
                          ? option === 'yes'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : option === 'maybe'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about this application..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedApp(null)
                    setVote('')
                    setNotes('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoteSubmit}
                  disabled={!vote || loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Vote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
