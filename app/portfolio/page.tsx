import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navigation from '@/components/Navigation'
import PortfolioClient from './PortfolioClient'

export default async function PortfolioPage() {
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

  // Get all investments
  const { data: investments } = await supabase
    .from('saifcrm_investments')
    .select('*')
    .order('investment_date', { ascending: false })

  // Get applications with deliberation notes to map to investments by company name
  const { data: applications } = await supabase
    .from('saifcrm_applications')
    .select(`
      id,
      company_name,
      deliberation:saifcrm_deliberations(thoughts)
    `)

  // Create a map of company name -> notes
  const companyNotesMap: Record<string, string | null> = {}
  applications?.forEach(app => {
    const deliberation = Array.isArray(app.deliberation) ? app.deliberation[0] : app.deliberation
    if (deliberation?.thoughts) {
      companyNotesMap[app.company_name.toLowerCase()] = deliberation.thoughts
    }
  })

  // Attach notes to investments
  const investmentsWithNotes = (investments || []).map(inv => ({
    ...inv,
    meetingNotes: companyNotesMap[inv.company_name.toLowerCase()] || null
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userName={profile?.name || user.email || 'User'} />
      <PortfolioClient investments={investmentsWithNotes} />
    </div>
  )
}
