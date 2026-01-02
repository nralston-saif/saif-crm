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

  // Get user profile (using auth_user_id to link to auth.users)
  const { data: profile } = await supabase
    .from('saif_people')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .single()

  // Get applications in deliberation with all votes revealed
  const { data: applications } = await supabase
    .from('saifcrm_applications')
    .select(`
      *,
      saifcrm_votes(id, vote, user_id, notes, vote_type, saif_people(name)),
      saifcrm_deliberations(*),
      email_sender:saif_people!applications_email_sender_id_fkey(name)
    `)
    .eq('stage', 'deliberation')
    .eq('votes_revealed', true)

  // Get all people for reference
  const { data: people } = await supabase
    .from('saif_people')
    .select('id, name')

  const peopleMap = new Map(people?.map((p) => [p.id, p.name]) || [])

  // Transform applications to include vote breakdown
  const applicationsWithVotes = applications?.map((app) => {
    // Filter to only initial votes
    const initialVotes = app.saifcrm_votes?.filter((v: any) => v.vote_type === 'initial') || []

    const votes = initialVotes.map((v: any) => ({
      userId: v.user_id,
      userName: v.saif_people?.name || peopleMap.get(v.user_id) || 'Unknown',
      vote: v.vote,
      notes: v.notes,
    }))

    // Handle deliberations being returned as object (one-to-one) or array (one-to-many)
    const deliberation = Array.isArray(app.saifcrm_deliberations)
      ? app.saifcrm_deliberations[0]
      : app.saifcrm_deliberations || null

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
        userId={profile?.id || ''}
      />
    </div>
  )
}
