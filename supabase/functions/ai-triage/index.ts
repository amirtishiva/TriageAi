import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PatientContext {
  patientId: string
  chiefComplaint: string
  vitals: {
    heartRate?: number
    systolicBp?: number
    diastolicBp?: number
    respiratoryRate?: number
    temperature?: number
    oxygenSaturation?: number
    painLevel?: number
  }
  allergies?: string[]
  medications?: string[]
  medicalHistory?: string[]
  age?: number
  gender?: string
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
  }>
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Validate user has nurse or charge_nurse role
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claims.claims.sub as string

    // Parse request body
    const body: PatientContext = await req.json()
    const { patientId, chiefComplaint, vitals, allergies, medications, medicalHistory, age, gender } = body

    if (!patientId || !chiefComplaint) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: patientId and chiefComplaint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build the clinical prompt for Gemini
    const clinicalPrompt = buildClinicalPrompt({
      chiefComplaint,
      vitals,
      allergies,
      medications,
      medicalHistory,
      age,
      gender
    })

    // Call Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: clinicalPrompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData: GeminiResponse = await geminiResponse.json()
    const aiResponseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiResponseText) {
      console.error('Empty response from Gemini')
      return new Response(
        JSON.stringify({ error: 'AI returned empty response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the structured AI response
    let aiResult
    try {
      aiResult = JSON.parse(aiResponseText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponseText)
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map ESI to enum value
    const esiLevel = String(aiResult.esiLevel || '3')

    // Update or create triage case
    const { data: existingCase, error: fetchError } = await supabase
      .from('triage_cases')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle()

    let triageCaseId: string

    if (existingCase) {
      // Update existing case
      const { error: updateError } = await supabase
        .from('triage_cases')
        .update({
          ai_draft_esi: esiLevel,
          ai_confidence: aiResult.confidence || 75,
          ai_sbar_situation: aiResult.sbar?.situation,
          ai_sbar_background: aiResult.sbar?.background,
          ai_sbar_assessment: aiResult.sbar?.assessment,
          ai_sbar_recommendation: aiResult.sbar?.recommendation,
          ai_extracted_symptoms: aiResult.extractedSymptoms || [],
          ai_extracted_timeline: aiResult.timeline || '',
          ai_comorbidities: aiResult.comorbidities || [],
          ai_influencing_factors: aiResult.influencingFactors || [],
          ai_generated_at: new Date().toISOString(),
          status: 'pending_validation'
        })
        .eq('id', existingCase.id)

      if (updateError) {
        console.error('Failed to update triage case:', updateError)
        throw updateError
      }
      triageCaseId = existingCase.id
    } else {
      // Create new case
      const { data: newCase, error: insertError } = await supabase
        .from('triage_cases')
        .insert({
          patient_id: patientId,
          ai_draft_esi: esiLevel,
          ai_confidence: aiResult.confidence || 75,
          ai_sbar_situation: aiResult.sbar?.situation,
          ai_sbar_background: aiResult.sbar?.background,
          ai_sbar_assessment: aiResult.sbar?.assessment,
          ai_sbar_recommendation: aiResult.sbar?.recommendation,
          ai_extracted_symptoms: aiResult.extractedSymptoms || [],
          ai_extracted_timeline: aiResult.timeline || '',
          ai_comorbidities: aiResult.comorbidities || [],
          ai_influencing_factors: aiResult.influencingFactors || [],
          ai_generated_at: new Date().toISOString(),
          status: 'pending_validation'
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Failed to create triage case:', insertError)
        throw insertError
      }
      triageCaseId = newCase.id
    }

    // Insert audit log
    await supabase.from('audit_logs').insert({
      triage_case_id: triageCaseId,
      patient_id: patientId,
      user_id: userId,
      action: 'ai_triage_completed',
      details: {
        draft_esi: esiLevel,
        confidence: aiResult.confidence
      }
    })

    // Return the AI result
    return new Response(
      JSON.stringify({
        success: true,
        triageCaseId,
        aiResult: {
          draftESI: parseInt(esiLevel),
          confidence: aiResult.confidence || 75,
          sbar: aiResult.sbar,
          extractedSymptoms: aiResult.extractedSymptoms || [],
          timeline: aiResult.timeline || '',
          comorbidities: aiResult.comorbidities || [],
          influencingFactors: aiResult.influencingFactors || []
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('AI triage error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function buildClinicalPrompt(context: Omit<PatientContext, 'patientId'>): string {
  const vitalsText = context.vitals ? `
Vital Signs:
- Heart Rate: ${context.vitals.heartRate || 'N/A'} bpm
- Blood Pressure: ${context.vitals.systolicBp || 'N/A'}/${context.vitals.diastolicBp || 'N/A'} mmHg
- Respiratory Rate: ${context.vitals.respiratoryRate || 'N/A'} breaths/min
- Temperature: ${context.vitals.temperature || 'N/A'}°F
- Oxygen Saturation: ${context.vitals.oxygenSaturation || 'N/A'}%
- Pain Level: ${context.vitals.painLevel || 'N/A'}/10
` : ''

  return `You are an expert emergency medicine clinical decision support system. Analyze the following patient presentation and provide a structured triage assessment.

Patient Demographics:
- Age: ${context.age || 'Unknown'}
- Gender: ${context.gender || 'Unknown'}

Chief Complaint: ${context.chiefComplaint}

${vitalsText}

Allergies: ${context.allergies?.join(', ') || 'NKDA'}
Current Medications: ${context.medications?.join(', ') || 'None reported'}
Medical History: ${context.medicalHistory?.join(', ') || 'None reported'}

Based on this information, provide a JSON response with the following structure:
{
  "esiLevel": <number 1-5>,
  "confidence": <number 0-100>,
  "sbar": {
    "situation": "<brief description of current situation>",
    "background": "<relevant medical history and context>",
    "assessment": "<clinical assessment based on presentation>",
    "recommendation": "<recommended interventions and disposition>"
  },
  "extractedSymptoms": ["<symptom1>", "<symptom2>"],
  "timeline": "<when symptoms started and progression>",
  "comorbidities": ["<relevant comorbidity1>", "<comorbidity2>"],
  "influencingFactors": [
    {
      "factor": "<factor description>",
      "category": "<vital|symptom|history|age|other>",
      "impact": "<increases|decreases|neutral>",
      "weight": <number 0-1>
    }
  ]
}

ESI Guidelines:
- ESI 1: Immediate life-saving intervention required (resuscitation)
- ESI 2: High risk, confused, severe pain/distress, or vital sign abnormalities
- ESI 3: Multiple resources needed, moderate acuity
- ESI 4: One resource needed
- ESI 5: No resources needed

Respond ONLY with the JSON object, no additional text.`
}
