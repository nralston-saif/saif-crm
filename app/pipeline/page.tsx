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

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single()

  // Get applications in pipeline with votes and user info
  const { data: applications } = await supabase
    .from('applications')
    .select(`
      *,
      votes(id, vote, user_id, notes, vote_type, users(name))
    `)
    .in('stage', ['new', 'voting'])
    .order('submitted_at', { ascending: false })

  // Get old/archived applications (already processed)
  const { data: oldApplications } = await supabase
    .from('applications')
    .select('*')
    .in('stage', ['deliberation', 'invested', 'rejected'])
    .order('submitted_at', { ascending: false })

  // Transform applications to include vote counts and user's vote
  const applicationsWithVotes = applications?.map((app) => {
    // Filter to only initial votes
    const initialVotes = app.votes?.filter((v: any) => v.vote_type === 'initial') || []
    const voteCount = initialVotes.length
    const userVote = initialVotes.find((v: any) => v.user_id === user.id)

    // Map votes with user names for display when revealed
    const votesWithNames = initialVotes.map((v: any) => ({
      oduserId: v.user_id,
      userName: v.users?.name || 'Unknown',
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
        oldApplications={oldApplications || []}
        userId={user.id}
      />
    </div>
  )
}
