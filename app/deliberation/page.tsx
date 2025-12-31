import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navigation from '@/components/Navigation'
import DeliberationClient from './DeliberationClient'

export default async function DeliberationPage() {
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

  // Get applications in deliberation with all votes revealed
  const { data: applications } = await supabase
    .from('applications')
    .select(`
      *,
      votes(id, vote, user_id, notes, vote_type, users(name)),
      deliberations(*),
      email_sender:users!applications_email_sender_id_fkey(name)
    `)
    .eq('stage', 'deliberation')
    .eq('votes_revealed', true)

  // Get all users for reference
  const { data: users } = await supabase
    .from('users')
    .select('id, name')

  const usersMap = new Map(users?.map((u) => [u.id, u.name]) || [])

  // Transform applications to include vote breakdown
  const applicationsWithVotes = applications?.map((app) => {
    // Filter to only initial votes
    const initialVotes = app.votes?.filter((v: any) => v.vote_type === 'initial') || []

    const votes = initialVotes.map((v: any) => ({
      userId: v.user_id,
      userName: v.users?.name || usersMap.get(v.user_id) || 'Unknown',
      vote: v.vote,
      notes: v.notes,
    }))

    // Handle deliberations being returned as object (one-to-one) or array (one-to-many)
    const deliberation = Array.isArray(app.deliberations)
      ? app.deliberations[0]
      : app.deliberations || null

    return {
      id: app.id,
      company_name: app.company_name,
      founder_names: app.founder_names,
      founder_linkedins: app.founder_linkedins,
      founder_bios: app.founder_bios,
      primary_email: app.primary_email,
      company_description: app.company_description,
      website: app.website,
      previous_funding: app.previous_funding,
      deck_link: app.deck_link,
      submitted_at: app.submitted_at,
      stage: app.stage,
      votes,
      deliberation,
      email_sent: app.email_sent,
      email_sender_name: (app.email_sender as any)?.name || null,
    }
  }) || []

  // Sort: Undecided (newest first) at top, Decided (newest first) at bottom
  const undecided = applicationsWithVotes
    .filter(app => !app.deliberation?.decision || app.deliberation.decision === 'pending' || app.deliberation.decision === 'maybe')
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

  const decided = applicationsWithVotes
    .filter(app => app.deliberation?.decision === 'yes' || app.deliberation?.decision === 'no')
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userName={profile?.name || user.email || 'User'} />
      <DeliberationClient
        undecidedApplications={undecided}
        decidedApplications={decided}
        userId={user.id}
      />
    </div>
  )
}
