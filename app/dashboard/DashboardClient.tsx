'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type NeedsVoteApp = {
  id: string
  company_name: string
  founder_names: string | null
  company_description: string | null
  submitted_at: string
}

type NeedsDecisionApp = {
  id: string
  company_name: string
  founder_names: string | null
  submitted_at: string
}

type EmailAssignment = {
  id: string
  company_name: string
  founder_names: string | null
  primary_email: string | null
  stage: string
  email_sent: boolean | null
}

type AllEmailAssignment = EmailAssignment & {
  assignedTo: string
}

type Stats = {
  pipeline: number
  deliberation: number
  invested: number
  rejected: number
}

type Notification = {
  id: string
  company_name: string
  type: 'ready' | 'notes'
  updated_at?: string
}

type EmailTab = 'my-pending' | 'all-pending' | 'all-sent'

export default function DashboardClient({
  needsVote,
  myEmailAssignments,
  allEmailAssignments,
  needsDecision,
  stats,
  notifications,
  userId,
}: {
  needsVote: NeedsVoteApp[]
  myEmailAssignments: EmailAssignment[]
  allEmailAssignments: AllEmailAssignment[]
  needsDecision: NeedsDecisionApp[]
  stats: Stats
  notifications: Notification[]
  userId: string
}) {
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null)
  const [emailTab, setEmailTab] = useState<EmailTab>('my-pending')
  const router = useRouter()
  const supabase = createClient()

  const handleToggleEmailSent = async (appId: string, currentState: boolean | null) => {
    setUpdatingEmail(appId)

    const { error } = await supabase
      .from('applications')
      .update({ email_sent: !currentState })
      .eq('id', appId)

    if (!error) {
      router.refresh()
    }

    setUpdatingEmail(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  // My emails
  const myPendingEmails = myEmailAssignments.filter(app => !app.email_sent)
  const mySentEmails = myEmailAssignments.filter(app => app.email_sent)

  // All emails
  const allPendingEmails = allEmailAssignments.filter(app => !app.email_sent)
  const allSentEmails = allEmailAssignments.filter(app => app.email_sent)

  const getTabCount = (tab: EmailTab) => {
    switch (tab) {
      case 'my-pending': return myPendingEmails.length
      case 'all-pending': return allPendingEmails.length
      case 'all-sent': return allSentEmails.length
    }
  }

  const renderEmailItem = (app: EmailAssignment | AllEmailAssignment, showAssignee: boolean = false) => {
    const isSent = app.email_sent
    const assignedTo = 'assignedTo' in app ? app.assignedTo : null

    return (
      <div key={app.id} className="p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-start gap-3">
          <button
            onClick={() => handleToggleEmailSent(app.id, app.email_sent)}
            disabled={updatingEmail === app.id}
            className={`mt-0.5 flex-shrink-0 w-5 h-5 border-2 rounded transition-colors disabled:opacity-50 ${
              isSent
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            title={isSent ? 'Mark as not sent' : 'Mark as sent'}
          >
            {isSent && (
              <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-medium truncate ${isSent ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {app.company_name}
              </h3>
              <span className={`badge text-xs ${
                app.stage === 'deliberation'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {app.stage}
              </span>
              {showAssignee && assignedTo && (
                <span className="badge text-xs bg-blue-100 text-blue-700">
                  {assignedTo}
                </span>
              )}
            </div>
            {app.founder_names && (
              <p className={`text-sm truncate ${isSent ? 'text-gray-400' : 'text-gray-500'}`}>
                {app.founder_names}
              </p>
            )}
            {app.primary_email && (
              <a
                href={`mailto:${app.primary_email}`}
                className={`text-sm hover:underline ${isSent ? 'text-gray-400' : 'text-blue-600 hover:text-blue-700'}`}
              >
                {app.primary_email}
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Your tasks at a glance</p>
      </div>

      {/* Top Row: Needs Your Vote + Needs Decision */}
      <div className="grid gap-8 lg:grid-cols-2 mb-8">
        {/* Needs Your Vote Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-xl">
                <span className="text-amber-600 text-xl">⚡</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Needs Your Vote</h2>
                <p className="text-sm text-gray-500">{needsVote.length} application{needsVote.length !== 1 ? 's' : ''} waiting</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {needsVote.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-emerald-600 text-xl">✓</span>
                </div>
                <p className="text-gray-600">You're all caught up!</p>
                <p className="text-sm text-gray-400">No pending votes</p>
              </div>
            ) : (
              needsVote.map((app) => (
                <Link
                  key={app.id}
                  href={`/pipeline#app-${app.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{app.company_name}</h3>
                      {app.founder_names && (
                        <p className="text-sm text-gray-500 truncate">{app.founder_names}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {formatDate(app.submitted_at)}
                    </span>
                  </div>
                  {app.company_description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                      {app.company_description}
                    </p>
                  )}
                </Link>
              ))
            )}
          </div>

          {needsVote.length > 0 && (
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <Link
                href="/pipeline"
                className="text-sm font-medium text-[#1a1a1a] hover:text-black"
              >
                View all in Pipeline →
              </Link>
            </div>
          )}
        </section>

        {/* Needs Decision Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-xl">
                <span className="text-purple-600 text-xl">🤔</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Needs Decision</h2>
                <p className="text-sm text-gray-500">{needsDecision.length} in deliberation awaiting decision</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {needsDecision.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-emerald-600 text-xl">✓</span>
                </div>
                <p className="text-gray-600">All decisions made!</p>
                <p className="text-sm text-gray-400">No pending deliberations</p>
              </div>
            ) : (
              needsDecision.map((app) => (
                <Link
                  key={app.id}
                  href={`/deliberation/${app.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{app.company_name}</h3>
                      {app.founder_names && (
                        <p className="text-sm text-gray-500 truncate">{app.founder_names}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                      {formatDate(app.submitted_at)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          {needsDecision.length > 0 && (
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <Link
                href="/deliberation"
                className="text-sm font-medium text-[#1a1a1a] hover:text-black"
              >
                View all in Deliberation →
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Row: Email Follow-ups + Notifications */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Email Follow-ups Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
                <span className="text-blue-600 text-xl">✉️</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Email Follow-ups</h2>
                <p className="text-sm text-gray-500">
                  {myPendingEmails.length} yours pending, {mySentEmails.length} sent
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-100">
            <div className="flex">
              {[
                { id: 'my-pending' as EmailTab, label: 'My Pending' },
                { id: 'all-pending' as EmailTab, label: 'All Pending' },
                { id: 'all-sent' as EmailTab, label: 'All Sent' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setEmailTab(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    emailTab === tab.id
                      ? 'text-[#1a1a1a]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                    emailTab === tab.id
                      ? 'bg-[#1a1a1a] text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getTabCount(tab.id)}
                  </span>
                  {emailTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1a1a1a]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {emailTab === 'my-pending' && (
              myPendingEmails.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-emerald-600 text-xl">✓</span>
                  </div>
                  <p className="text-gray-600">All caught up!</p>
                  <p className="text-sm text-gray-400">No pending emails assigned to you</p>
                </div>
              ) : (
                myPendingEmails.map(app => renderEmailItem(app, false))
              )
            )}

            {emailTab === 'all-pending' && (
              allPendingEmails.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-emerald-600 text-xl">✓</span>
                  </div>
                  <p className="text-gray-600">Team is all caught up!</p>
                  <p className="text-sm text-gray-400">No pending emails for anyone</p>
                </div>
              ) : (
                allPendingEmails.map(app => renderEmailItem(app, true))
              )
            )}

            {emailTab === 'all-sent' && (
              allSentEmails.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-gray-400 text-xl">📭</span>
                  </div>
                  <p className="text-gray-600">No sent emails yet</p>
                  <p className="text-sm text-gray-400">Sent emails will appear here</p>
                </div>
              ) : (
                allSentEmails.map(app => renderEmailItem(app, true))
              )
            )}
          </div>
        </section>

        {/* Notifications Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl">
                <span className="text-blue-600 text-xl">🔔</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                <p className="text-sm text-gray-500">{notifications.length} update{notifications.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-gray-400 text-xl">🔔</span>
                </div>
                <p className="text-gray-600">No notifications</p>
                <p className="text-sm text-gray-400">You're all caught up</p>
              </div>
            ) : (
              notifications.map((notif, i) => (
                <Link
                  key={`${notif.id}-${i}`}
                  href={notif.type === 'ready' ? `/pipeline#app-${notif.id}` : `/deliberation/${notif.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">
                      {notif.type === 'ready' ? '✅' : '📝'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{notif.company_name}</h3>
                      <p className="text-sm text-gray-500">
                        {notif.type === 'ready' ? '3 votes - ready to advance' : 'New deliberation notes'}
                      </p>
                      {notif.updated_at && (
                        <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(notif.updated_at)}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
