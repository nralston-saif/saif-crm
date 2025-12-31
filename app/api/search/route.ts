import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get search query
    const url = new URL(request.url)
    const query = url.searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ applications: [], investments: [] })
    }

    // Search pattern for ilike
    const searchPattern = `%${query}%`

    // Search applications
    const { data: applications, error: appError } = await supabase
      .from('applications')
      .select('id, company_name, founder_names, company_description, stage, submitted_at')
      .or(`company_name.ilike.${searchPattern},founder_names.ilike.${searchPattern},company_description.ilike.${searchPattern}`)
      .order('submitted_at', { ascending: false })
      .limit(10)

    if (appError) {
      console.error('Error searching applications:', appError)
    }

    // Search investments
    const { data: investments, error: invError } = await supabase
      .from('investments')
      .select('id, company_name, founders, description, amount, investment_date')
      .or(`company_name.ilike.${searchPattern},founders.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .order('investment_date', { ascending: false })
      .limit(10)

    if (invError) {
      console.error('Error searching investments:', invError)
    }

    return NextResponse.json({
      applications: applications || [],
      investments: investments || [],
    })
  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    )
  }
}
