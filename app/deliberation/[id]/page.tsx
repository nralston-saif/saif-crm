import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Navigation from '@/components/Navigation'
import DeliberationDetailClient from './DeliberationDetailClient'

export default async function DeliberationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('saifcrm_users')
    .select('name')
    .eq('id', user.id)
    .single()

  // Get the application with all related data
  const { data: application, error } = await supabase
    .from('saifcrm_applications')
    .select(`
      *,
      saifcrm_votes(id, vote, user_id, notes, vote_type, saifcrm_users(name)),
      saifcrm_deliberations(*)
    `)
    .eq('id', id)
    .single()

  if (error || !application) {
    notFound()
  }

  // Get all users for reference
  const { data: users } = await supabase
    .from('saifcrm_users')
    .select('id, name')

  const usersMap = new Map(users?.map((u) => [u.id, u.name]) || [])

  // Transform votes
  const initialVotes = application.saifcrm_votes?.filter((v: any) => v.vote_type === 'initial') || []
  const votes = initialVotes.map((v: any) => ({
    oduserId: v.user_id,
    userName: v.saifcrm_users?.name || usersMap.get(v.user_id) || 'Unknown',
    vote: v.vote,
    notes: v.notes,
  }))

  // Handle deliberation
  const deliberation = Array.isArray(application.saifcrm_deliberations)
    ? application.saifcrm_deliberations[0]
    : application.saifcrm_deliberations || null

  const applicationData = {
    id: application.id,
    company_name: application.company_name,
    founder_names: application.founder_names,
    founder_linkedins: application.founder_linkedins,
    founder_bios: application.founder_bios,
    primary_email: application.primary_email,
    company_description: application.company_description,
    website: application.website,
    previous_funding: application.previous_funding,
    deck_link: application.deck_link,
    submitted_at: application.submitted_at,
    stage: application.stage,
    votes,
    deliberation,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userName={profile?.name || user.email || 'User'} />
      <DeliberationDetailClient
        application={applicationData}
        userId={user.id}
        userName={profile?.name || user.email || 'User'}
      />
    </div>
  )
}
