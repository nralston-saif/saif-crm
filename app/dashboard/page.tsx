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
    .from('saif_users')
    .select('name')
    .eq('id', user.id)
    .single()

  // Get applications in pipeline that need user's vote
  const { data: pipelineApps } = await supabase
    .from('saifcrm_applications')
    .select(`
      id,
      company_name,
      founder_names,
      company_description,
      submitted_at,
      saifcrm_votes(id, user_id, vote_type)
    `)
    .in('stage', ['new', 'voting'])
    .order('submitted_at', { ascending: false })

  // Filter to apps that need user's vote
  const needsVote = pipelineApps?.filter((app) => {
    const initialVotes = app.saifcrm_votes?.filter((v: any) => v.vote_type === 'initial') || []
    return !initialVotes.some((v: any) => v.user_id === user.id)
  }).map(app => ({
    id: app.id,
    company_name: app.company_name,
    founder_names: app.founder_names,
    company_description: app.company_description,
    submitted_at: app.submitted_at,
  })) || []

  // Get applications assigned to current user for email follow-up
  const { data: myEmailAssignments } = await supabase
    .from('saifcrm_applications')
    .select('id, company_name, founder_names, primary_email, stage, email_sent')
    .eq('email_sender_id', user.id)
    .in('stage', ['deliberation', 'rejected'])
    .order('submitted_at', { ascending: false })

  // Get ALL email assignments (from all users) for the team view
  const { data: allEmailAssignments } = await supabase
    .from('saifcrm_applications')
    .select(`
      id,
      company_name,
      founder_names,
      primary_email,
      stage,
      email_sent,
      email_sender_id,
      saif_users!applications_email_sender_id_fkey(name)
    `)
    .not('email_sender_id', 'is', null)
    .in('stage', ['deliberation', 'rejected'])
    .order('submitted_at', { ascending: false })

  // Get companies in deliberation needing decision
  const { data: deliberationApps } = await supabase
    .from('saifcrm_applications')
    .select(`
      id,
      company_name,
      founder_names,
      submitted_at,
      saifcrm_deliberations(decision)
    `)
    .eq('stage', 'deliberation')
    .order('submitted_at', { ascending: false })

  // Filter to those without a final decision
  const needsDecision = deliberationApps?.filter(app => {
    const delib = Array.isArray(app.saifcrm_deliberations) ? app.saifcrm_deliberations[0] : app.saifcrm_deliberations
    const decision = (delib as any)?.decision
    return !decision || decision === 'pending' || decision === 'maybe'
  }).map(app => ({
    id: app.id,
    company_name: app.company_name,
    founder_names: app.founder_names,
    submitted_at: app.submitted_at,
  })) || []

  // Get pipeline stats
  const { data: allApps } = await supabase
    .from('saifcrm_applications')
    .select('stage')

  const stats = {
    pipeline: allApps?.filter(a => a.stage === 'new' || a.stage === 'voting').length || 0,
    deliberation: allApps?.filter(a => a.stage === 'deliberation').length || 0,
    invested: allApps?.filter(a => a.stage === 'invested').length || 0,
    rejected: allApps?.filter(a => a.stage === 'rejected').length || 0,
  }

  // Notifications - cleared for fresh start
  const notifications: { id: string; company_name: string; type: 'ready' | 'notes'; updated_at?: string }[] = []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userName={profile?.name || user.email || 'User'} />
      <DashboardClient
        needsVote={needsVote}
        myEmailAssignments={myEmailAssignments || []}
        allEmailAssignments={allEmailAssignments?.map(app => ({
          ...app,
          assignedTo: (app.saif_users as any)?.name || 'Unknown'
        })) || []}
        needsDecision={needsDecision}
        stats={stats}
        notifications={notifications}
        userId={user.id}
      />
    </div>
  )
}
