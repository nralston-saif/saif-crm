import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Supabase with service role key for webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Webhook secret for authentication (set in JotForm webhook URL as ?secret=xxx)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    if (WEBHOOK_SECRET) {
      const url = new URL(request.url)
      const providedSecret = url.searchParams.get('secret')

      if (providedSecret !== WEBHOOK_SECRET) {
        console.error('Webhook authentication failed - invalid secret')
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    console.log('Received JotForm webhook - v7 with authentication')

    // JotForm sends data as form-encoded
    const formData = await request.formData()

    // Log all form data keys to debug
    const allKeys = Array.from(formData.keys())
    console.log('FormData keys received:', allKeys)

    // JotForm sends the actual submission data in 'rawRequest' or 'pretty' field
    const rawRequest = formData.get('rawRequest')
    const pretty = formData.get('pretty')

    console.log('rawRequest:', typeof rawRequest === 'string' ? rawRequest.substring(0, 500) : rawRequest)
    console.log('pretty:', typeof pretty === 'string' ? pretty.substring(0, 500) : pretty)

    // Parse the submission data
    let submissionData: any = {}

    if (rawRequest && typeof rawRequest === 'string') {
      try {
        submissionData = JSON.parse(rawRequest)
        console.log('Parsed rawRequest, keys:', Object.keys(submissionData))
      } catch (e) {
        console.error('Failed to parse rawRequest:', e)
      }
    }

    if (pretty && typeof pretty === 'string') {
      try {
        const prettyData = JSON.parse(pretty)
        console.log('Parsed pretty, keys:', Object.keys(prettyData))
        // pretty might have the actual answers
        if (prettyData.answers) {
          submissionData = prettyData
        }
      } catch (e) {
        console.error('Failed to parse pretty:', e)
      }
    }

    // Helper to get form field value from submission data
    const getFormField = (key: string): string | null => {
      // Check if submissionData has an 'answers' object
      if (submissionData.answers && submissionData.answers[key]) {
        const answer = submissionData.answers[key]
        // Answer might be an object with 'answer' property or just a string
        const value = typeof answer === 'object' ? answer.answer : answer
        if (!value) return null
        const trimmed = String(value).trim()
        return trimmed !== '' ? trimmed : null
      }

      // Fallback to direct property
      if (submissionData[key]) {
        const trimmed = String(submissionData[key]).trim()
        return trimmed !== '' ? trimmed : null
      }

      return null
    }

    // Build application object using exact JotForm field IDs
    const application = {
      submission_id: submissionData.submission_id || formData.get('submissionID') || Date.now().toString(),
      submitted_at: submissionData.created_at || new Date().toISOString(),
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
      .from('saifcrm_applications')
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
    version: 'v7-with-authentication',
    authenticated: !!WEBHOOK_SECRET,
    timestamp: new Date().toISOString()
  })
}
