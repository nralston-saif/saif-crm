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

  // Get user profile (using auth_user_id to link to auth.users)
  const { data: profile } = await supabase
    .from('saif_people')
    .select('id, name')
    .eq('auth_user_id', user.id)
    .single()

  // Get the application with all related data
  const { data: application, error } = await supabase
    .from('saifcrm_applications')
    .select(`
      *,
      saifcrm_votes(id, vote, user_id, notes, vote_type, saif_people(name)),
      saifcrm_deliberations(*)
    `)
    .eq('id', id)
    .single()

  if (error || !application) {
    notFound()
  }

  // Get all people for reference
  const { data: people } = await supabase
    .from('saif_people')
    .select('id, name')

  const peopleMap = new Map(people?.map((p) => [p.id, p.name]) || [])

  // Transform votes
  const initialVotes = application.saifcrm_votes?.filter((v: any) => v.vote_type === 'initial') || []
  const votes = initialVotes.map((v: any) => ({
    oduserId: v.user_id,
    userName: v.saif_people?.name || peopleMap.get(v.user_id) || 'Unknown',
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
        userId={profile?.id || ''}
        userName={profile?.name || user.email || 'User'}
      />
    </div>
  )
}
