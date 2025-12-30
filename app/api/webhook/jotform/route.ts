import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Supabase with service role key for webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('Received JotForm webhook - FINAL VERSION with rawSubmission fix')

    // JotForm sends data as form-encoded
    const formData = await request.formData()

    // Log all form data keys to debug
    const allKeys = Array.from(formData.keys())
    console.log('FormData keys received:', allKeys)

    // Helper to get form field value - JotForm prefixes fields with rawSubmission[]
    const getFormField = (key: string): string | null => {
      // Try with rawSubmission[] prefix first (JotForm format)
      let value = formData.get(`rawSubmission[${key}]`)
      // Fallback to direct key
      if (!value) value = formData.get(key)
      if (!value) return null
      if (typeof value !== 'string') return null
      const trimmed = value.trim()
      return trimmed !== '' ? trimmed : null
    }

    // Build application object using exact JotForm field IDs
    const application = {
      submission_id: getFormField('event_id') || Date.now().toString(),
      submitted_at: getFormField('submitDate')
        ? new Date(parseInt(getFormField('submitDate')!)).toISOString()
        : new Date().toISOString(),
      company_name: getFormField('q29_companyName') || 'Unknown Company',
      founder_names: getFormField('q26_typeA'),
      founder_linkedins: getFormField('q28_founderLinkedins'),
      founder_bios: getFormField('q40_founderBios'),
      primary_email: getFormField('q32_primaryEmail'),
      company_description: getFormField('q30_companyDescription'),
      website: getFormField('q31_websiteif'),
      previous_funding: getFormField('q35_haveYou'),
      deck_link: getFormField('q41_linkTo'),
      stage: 'new',
      votes_revealed: false,
      all_votes_in: false,
    }

    console.log('Mapped application:', application)

    // Insert into Supabase
    const { data, error } = await supabase
      .from('applications')
      .insert(application)
      .select()
      .single()

    if (error) {
      console.error('Error inserting application:', error)
      return NextResponse.json(
        { error: 'Failed to save application', details: error.message },
        { status: 500 }
      )
    }

    console.log('Application created:', data.id)

    return NextResponse.json({
      success: true,
      applicationId: data.id,
      message: 'Application received successfully'
    })

  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'JotForm webhook endpoint is ready',
    version: 'v5-rawSubmission-fix',
    timestamp: new Date().toISOString()
  })
}
