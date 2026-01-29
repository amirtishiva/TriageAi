import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidateRequest {
  triageCaseId: string
  action: 'confirm' | 'override'
  overrideESI?: number
  overrideRationale?: string
  overrideNotes?: string
}

const ESI_RESPONSE_TARGETS_MS: Record<number, number> = {
  1: 0, // Immediate
  2: 120000, // 2 minutes
  3: 1800000, // 30 minutes
  4: 3600000, // 60 minutes
  5: 7200000 // 120 minutes
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

    // Parse request
    const body: ValidateRequest = await req.json()
    const { triageCaseId, action, overrideESI, overrideRationale, overrideNotes } = body

    if (!triageCaseId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: triageCaseId and action' }),
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

    // Determine final ESI
    let finalESI: string
    let isOverride = false
    let rationaleEnum = null

    if (action === 'override') {
      if (!overrideESI || !overrideRationale) {
        return new Response(
          JSON.stringify({ error: 'Override requires overrideESI and overrideRationale' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      finalESI = String(overrideESI)
      isOverride = true
      rationaleEnum = overrideRationale
    } else {
      finalESI = triageCase.ai_draft_esi || '3'
    }

    const esiNumber = parseInt(finalESI)

    // Update triage case
    const { error: updateError } = await supabase
      .from('triage_cases')
      .update({
        validated_esi: finalESI,
        is_override: isOverride,
        override_rationale: rationaleEnum,
        override_notes: overrideNotes || null,
        validated_by: userId,
        validated_at: new Date().toISOString(),
        status: 'validated'
      })
      .eq('id', triageCaseId)

    if (updateError) {
      console.error('Failed to update triage case:', updateError)
      throw updateError
    }

    // Update patient status
    await supabase
      .from('patients')
      .update({ status: 'validated' })
      .eq('id', triageCase.patient_id)

    // Insert audit log
    await supabase.from('audit_logs').insert({
      triage_case_id: triageCaseId,
      patient_id: triageCase.patient_id,
      user_id: userId,
      action: isOverride ? 'triage_overridden' : 'triage_validated',
      details: {
        ai_draft_esi: triageCase.ai_draft_esi,
        validated_esi: finalESI,
        is_override: isOverride,
        override_rationale: rationaleEnum
      }
    })

    // Handle routing based on ESI level
    let routingResult = null

    if (esiNumber === 1) {
      // ESI 1: Broadcast to code team immediately
      const channel = supabase.channel('alerts')
      await channel.send({
        type: 'broadcast',
        event: 'critical_case',
        payload: {
          triageCaseId,
          patientId: triageCase.patient_id,
          esiLevel: 1,
          patient: {
            firstName: triageCase.patients?.first_name,
            lastName: triageCase.patients?.last_name,
            chiefComplaint: triageCase.patients?.chief_complaint
          }
        }
      })

      // Update case status
      await supabase
        .from('triage_cases')
        .update({
          status: 'assigned',
          escalation_status: 'pending'
        })
        .eq('id', triageCaseId)

      routingResult = { type: 'broadcast', target: 'code_team' }

    } else if (esiNumber === 2) {
      // ESI 2: Find zone physician and assign with 2-min deadline
      const zone = triageCase.assigned_zone || 'A'
      
      // Find available physician in zone
      const { data: physicians } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'physician')
        .eq('zone', zone)
        .limit(1)

      if (physicians && physicians.length > 0) {
        const assignedPhysician = physicians[0].user_id
        const deadline = new Date(Date.now() + ESI_RESPONSE_TARGETS_MS[2])

        // Create routing assignment
        const { data: assignment, error: assignError } = await supabase
          .from('routing_assignments')
          .insert({
            triage_case_id: triageCaseId,
            assigned_to: assignedPhysician,
            assigned_role: 'physician',
            escalation_level: 0,
            escalation_deadline: deadline.toISOString(),
            status: 'pending'
          })
          .select()
          .single()

        if (!assignError) {
          // Update triage case
          await supabase
            .from('triage_cases')
            .update({
              status: 'assigned',
              assigned_to: assignedPhysician,
              assigned_zone: zone,
              escalation_status: 'pending'
            })
            .eq('id', triageCaseId)

          // Broadcast alert
          const channel = supabase.channel('alerts')
          await channel.send({
            type: 'broadcast',
            event: 'case_assigned',
            payload: {
              triageCaseId,
              assignedTo: assignedPhysician,
              esiLevel: 2,
              deadline: deadline.toISOString()
            }
          })

          routingResult = {
            type: 'assigned',
            assignedTo: assignedPhysician,
            deadline: deadline.toISOString()
          }
        }
      } else {
        // No physician available - escalate immediately
        routingResult = { type: 'escalation_needed', reason: 'no_physician_available' }
      }

    } else {
      // ESI 3-5: Add to track board queue
      await supabase
        .from('triage_cases')
        .update({
          status: 'validated',
          escalation_status: 'none'
        })
        .eq('id', triageCaseId)

      routingResult = { type: 'queued', queue: 'track_board' }
    }

    return new Response(
      JSON.stringify({
        success: true,
        triageCaseId,
        validatedESI: esiNumber,
        isOverride,
        routing: routingResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Validate triage error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
