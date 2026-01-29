import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AcknowledgeRequest {
  triageCaseId: string
  routingAssignmentId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claims.claims.sub as string

    const body: AcknowledgeRequest = await req.json()
    const { triageCaseId, routingAssignmentId } = body

    if (!triageCaseId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: triageCaseId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the triage case
    const { data: triageCase, error: fetchError } = await supabase
      .from('triage_cases')
      .select('*, patients(*)')
      .eq('id', triageCaseId)
      .single()

    if (fetchError || !triageCase) {
      return new Response(
        JSON.stringify({ error: 'Triage case not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the pending routing assignment
    let assignment
    if (routingAssignmentId) {
      const { data } = await supabase
        .from('routing_assignments')
        .select('*')
        .eq('id', routingAssignmentId)
        .single()
      assignment = data
    } else {
      const { data } = await supabase
        .from('routing_assignments')
        .select('*')
        .eq('triage_case_id', triageCaseId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      assignment = data
    }

    const now = new Date()
    let responseTimeMs = null
    let metTarget = false

    if (assignment) {
      // Calculate response time
      const assignmentCreated = new Date(assignment.created_at)
      responseTimeMs = now.getTime() - assignmentCreated.getTime()

      // Check if response met the target
      if (assignment.escalation_deadline) {
        const deadline = new Date(assignment.escalation_deadline)
        metTarget = now < deadline
      }

      // Update routing assignment
      await supabase
        .from('routing_assignments')
        .update({
          acknowledged_at: now.toISOString(),
          response_time_ms: responseTimeMs,
          status: 'acknowledged'
        })
        .eq('id', assignment.id)
    }

    // Update triage case
    await supabase
      .from('triage_cases')
      .update({
        status: 'acknowledged',
        acknowledged_at: now.toISOString(),
        assigned_to: userId,
        escalation_status: 'resolved'
      })
      .eq('id', triageCaseId)

    // Update patient status
    await supabase
      .from('patients')
      .update({ status: 'acknowledged' })
      .eq('id', triageCase.patient_id)

    // Insert audit log
    await supabase.from('audit_logs').insert({
      triage_case_id: triageCaseId,
      patient_id: triageCase.patient_id,
      user_id: userId,
      action: 'case_acknowledged',
      details: {
        response_time_ms: responseTimeMs,
        met_target: metTarget,
        esi_level: triageCase.validated_esi
      }
    })

    // Broadcast acknowledgment
    const channel = supabase.channel('alerts')
    await channel.send({
      type: 'broadcast',
      event: 'case_acknowledged',
      payload: {
        triageCaseId,
        acknowledgedBy: userId,
        responseTimeMs,
        metTarget
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        triageCaseId,
        acknowledgedAt: now.toISOString(),
        responseTimeMs,
        metTarget
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Acknowledge case error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
