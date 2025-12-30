import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Initialize Supabase with service role key for webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('Received JotForm webhook')

    // JotForm sends data as form-encoded
    const formData = await request.formData()
    const rawSubmission = formData.get('rawRequest')

    let submission: any = {}

    if (rawSubmission) {
      // Parse the raw JSON submission
      submission = JSON.parse(rawSubmission as string)
    } else {
      // Parse individual form fields
      for (const [key, value] of formData.entries()) {
        submission[key] = value
      }
    }

    console.log('Parsed submission:', JSON.stringify(submission, null, 2))

    // Extract field value safely - handle both string and File types
    const getField = (key: string) => {
      const value = submission[key]
      if (!value) return null

      // If it's a File object, skip it
      if (typeof value === 'object' && value.constructor.name === 'File') return null

      // Convert to string and trim
      const stringValue = String(value).trim()
      return stringValue !== '' ? stringValue : null
    }

    // Build application object using exact JotForm field IDs
    const application = {
      submission_id: submission.event_id || submission.submissionID || Date.now().toString(),
      submitted_at: submission.submitDate
        ? new Date(parseInt(submission.submitDate)).toISOString()
        : new Date().toISOString(),
      company_name: getField('q29_companyName') || 'Unknown Company',
      founder_names: getField('q26_typeA'),
      founder_linkedins: getField('q28_founderLinkedins'),
      founder_bios: getField('q40_founderBios'),
      primary_email: getField('q32_primaryEmail'),
      company_description: getField('q30_companyDescription'),
      website: getField('q31_websiteif'),
      previous_funding: getField('q35_haveYou'),
      deck_link: getField('q41_linkTo'),
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
    timestamp: new Date().toISOString()
  })
}
