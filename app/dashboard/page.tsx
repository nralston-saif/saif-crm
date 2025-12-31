import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navigation from '@/components/Navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single()

  // Get applications in pipeline that need user's vote
  const { data: pipelineApps } = await supabase
    .from('applications')
    .select(`
      id,
      company_name,
      founder_names,
      company_description,
      submitted_at,
      votes(id, user_id, vote_type)
    `)
    .in('stage', ['new', 'voting'])
    .order('submitted_at', { ascending: false })

  // Filter to apps that need user's vote
  const needsVote = pipelineApps?.filter((app) => {
    const initialVotes = app.votes?.filter((v: any) => v.vote_type === 'initial') || []
    return !initialVotes.some((v: any) => v.user_id === user.id)
  }).map(app => ({
    id: app.id,
    company_name: app.company_name,
    founder_names: app.founder_names,
    company_description: app.company_description,
    submitted_at: app.submitted_at,
  })) || []

  // Get applications assigned to user for email follow-up
  const { data: emailAssignments } = await supabase
    .from('applications')
    .select('id, company_name, founder_names, primary_email, stage, email_sent')
    .eq('email_sender_id', user.id)
    .in('stage', ['deliberation', 'rejected'])
    .order('submitted_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userName={profile?.name || user.email || 'User'} />
      <DashboardClient
        needsVote={needsVote}
        emailAssignments={emailAssignments || []}
        userId={user.id}
      />
    </div>
  )
}
