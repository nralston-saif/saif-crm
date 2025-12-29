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
      votes(id, vote, user_id, notes, users(name)),
      deliberations(*)
    `)
    .eq('stage', 'deliberation')
    .eq('votes_revealed', true)
    .order('submitted_at', { ascending: false })

  // Get all users for reference
  const { data: users } = await supabase
    .from('users')
    .select('id, name')

  const usersMap = new Map(users?.map((u) => [u.id, u.name]) || [])

  // Transform applications to include vote breakdown
  const applicationsWithVotes = applications?.map((app) => {
    const votes = app.votes?.map((v: any) => ({
      userId: v.user_id,
      userName: v.users?.name || usersMap.get(v.user_id) || 'Unknown',
      vote: v.vote,
      notes: v.notes,
    })) || []

    const deliberation = app.deliberations?.[0] || null

    return {
      ...app,
      votes,
      deliberation,
    }
  }) || []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userName={profile?.name || user.email || 'User'} />
      <DeliberationClient
        applications={applicationsWithVotes}
        userId={user.id}
      />
    </div>
  )
}
