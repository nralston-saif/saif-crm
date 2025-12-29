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

    // Extract answers from JotForm format
    const answers = submission.answers || {}

    // Map JotForm fields to our database schema
    // JotForm uses field IDs, so we need to find by field name
    const getAnswer = (fieldName: string) => {
      const field = Object.values(answers).find(
        (a: any) => a.name?.toLowerCase().includes(fieldName.toLowerCase()) ||
                    a.text?.toLowerCase().includes(fieldName.toLowerCase())
      ) as any
      return field?.answer || field?.prettyFormat || null
    }

    // Alternative: direct field access if JotForm sends with field names
    const getField = (fieldName: string) => {
      return submission[fieldName] || formData.get(fieldName) || null
    }

    // Build application object
    const application = {
      submission_id: submission.submissionID || submission.submission_id || Date.now().toString(),
      submitted_at: submission.created_at || new Date().toISOString(),
      company_name: getAnswer('company name') || getField('Company Name') || 'Unknown Company',
      founder_names: getAnswer('founder names') || getField('Founder Names'),
      founder_linkedins: getAnswer('linkedin') || getField('Founder LinkedIns'),
      founder_bios: getAnswer('founder bio') || getField('Founder Bios (1 or 2 sentences per founder)'),
      primary_email: getAnswer('email') || getField('Primary Email'),
      company_description: getAnswer('description') || getField('Company Description'),
      website: getAnswer('website') || getField('Website (if exists)'),
      previous_funding: getAnswer('funding') || getAnswer('raised funding') || getField('Have you previously raised funding? If so from whom? Have you done any other accelerators? Which one, when, what batch?'),
      deck_link: getAnswer('deck') || getAnswer('documents') || getField('Link to additional documents (deck, one-pager, ect.)'),
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
