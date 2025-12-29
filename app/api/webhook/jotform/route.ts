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

    let submission: any

    if (rawSubmission) {
      // Parse the raw JSON submission
      submission = JSON.parse(rawSubmission as string)
    } else {
      // Fallback: parse individual form fields
      const data: any = {}
      formData.forEach((value, key) => {
        data[key] = value
      })
      submission = data
    }

    console.log('Parsed submission:', JSON.stringify(submission, null, 2))

    // JotForm sends fields with IDs like q29_companyName
    // Extract by looking for specific field patterns
    const getJotFormField = (...patterns: string[]) => {
      for (const key of Object.keys(submission)) {
        for (const pattern of patterns) {
          if (key.toLowerCase().includes(pattern.toLowerCase())) {
            const value = submission[key]
            return value && value.trim() !== '' ? value : null
          }
        }
      }
      return null
    }

    // Build application object
    const application = {
      submission_id: submission.event_id || submission.submissionID || Date.now().toString(),
      submitted_at: submission.submitDate
        ? new Date(parseInt(submission.submitDate)).toISOString()
        : new Date().toISOString(),
      company_name: getJotFormField('companyname', 'company_name') || 'Unknown Company',
      founder_names: getJotFormField('typea', 'founder_names', 'foundername'),
      founder_linkedins: getJotFormField('founderlinkedin', 'linkedin'),
      founder_bios: getJotFormField('founderbio', 'bio'),
      primary_email: getJotFormField('primaryemail', 'email'),
      company_description: getJotFormField('companydescription', 'description'),
      website: getJotFormField('website'),
      previous_funding: getJotFormField('haveyou', 'funding', 'raised'),
      deck_link: getJotFormField('linkto', 'deck', 'documents'),
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
