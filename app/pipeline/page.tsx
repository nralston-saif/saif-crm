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

  // Get applications in pipeline
  const { data: applications } = await supabase
    .from('applications')
    .select(`
      *,
      votes(id, vote, user_id)
    `)
    .in('stage', ['new', 'voting'])
    .order('submitted_at', { ascending: false })

  // Get current user's votes
  const { data: userVotes } = await supabase
    .from('votes')
    .select('application_id, vote, notes')
    .eq('user_id', user.id)
    .eq('vote_type', 'initial')

  const userVotesMap = new Map(
    userVotes?.map((v) => [v.application_id, { vote: v.vote, notes: v.notes }]) || []
  )

  // Transform applications to include vote counts and user's vote
  const applicationsWithVotes = applications?.map((app) => {
    const voteCount = app.votes?.length || 0
    const userVote = userVotesMap.get(app.id)

    return {
      ...app,
      voteCount,
      userVote: userVote?.vote,
      userNotes: userVote?.notes,
    }
  }) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userName={profile?.name || user.email || 'User'} />
      <PipelineClient
        applications={applicationsWithVotes}
        userId={user.id}
      />
    </div>
  )
}
