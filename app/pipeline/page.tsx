import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navigation from '@/components/Navigation'
import PipelineClient from './PipelineClient'

export default async function PipelinePage() {
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

  // Get applications in pipeline with votes and user info
  const { data: applications } = await supabase
    .from('saifcrm_applications')
    .select(`
      *,
      saifcrm_votes(id, vote, user_id, notes, vote_type, saif_people(name))
    `)
    .in('stage', ['new', 'voting'])
    .order('submitted_at', { ascending: false })

  // Get old/archived applications (already processed) with email sender info
  const { data: oldApplications } = await supabase
    .from('saifcrm_applications')
    .select(`
      *,
      email_sender:saif_people!applications_email_sender_id_fkey(name)
    `)
    .in('stage', ['deliberation', 'invested', 'rejected'])
    .order('submitted_at', { ascending: false })

  // Get all partners for email sender selection
  const { data: partners } = await supabase
    .from('saif_people')
    .select('id, name')
    .eq('role', 'partner')
    .eq('status', 'active')
    .order('name')

  // Transform applications to include vote counts and user's vote
  const applicationsWithVotes = applications?.map((app) => {
    // Filter to only initial votes
    const initialVotes = app.saifcrm_votes?.filter((v: any) => v.vote_type === 'initial') || []
    const voteCount = initialVotes.length
    // Compare with person id (profile.id), not auth user id
    const userVote = initialVotes.find((v: any) => v.user_id === profile?.id)

    // Map votes with user names for display when revealed
    const votesWithNames = initialVotes.map((v: any) => ({
      oduserId: v.user_id,
      userName: v.saif_people?.name || 'Unknown',
      vote: v.vote,
      notes: v.notes,
    }))

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
      votes_revealed: app.votes_revealed,
      voteCount,
      userVote: userVote?.vote,
      userNotes: userVote?.notes,
      allVotes: votesWithNames,
    }
  }) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userName={profile?.name || user.email || 'User'} />
      <PipelineClient
        applications={applicationsWithVotes}
        oldApplications={(oldApplications || []).map(app => ({
          ...app,
          email_sender_name: (app.email_sender as any)?.name || null
        }))}
        userId={profile?.id || ''}
        partners={partners || []}
      />
    </div>
  )
}
