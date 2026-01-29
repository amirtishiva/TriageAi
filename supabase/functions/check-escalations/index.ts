import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Escalation ladder (2 minutes between each level)
const ESCALATION_TIMEOUT_MS = 120000 // 2 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // This function is called by a cron job or manually
    // Use service role for administrative access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = new Date()
    console.log(`Checking escalations at ${now.toISOString()}`)

    // Find overdue routing assignments
    const { data: overdueAssignments, error: queryError } = await supabase
      .from('routing_assignments')
      .select(`
        *,
        triage_cases!inner(
          id,
          patient_id,
          validated_esi,
          assigned_zone,
          patients(first_name, last_name, chief_complaint)
        )
      `)
      .eq('status', 'pending')
      .lt('escalation_deadline', now.toISOString())

    if (queryError) {
      console.error('Query error:', queryError)
      throw queryError
    }

    console.log(`Found ${overdueAssignments?.length || 0} overdue assignments`)

    const results = []

    for (const assignment of (overdueAssignments || [])) {
      const currentLevel = assignment.escalation_level
      const nextLevel = currentLevel + 1
      const triageCase = assignment.triage_cases

      console.log(`Processing escalation for case ${triageCase.id}, level ${currentLevel} -> ${nextLevel}`)

      // Determine next escalation target
      let nextRole: 'physician' | 'senior_physician' | 'charge_nurse'
      let isFinalEscalation = false

      if (nextLevel === 1) {
        nextRole = 'senior_physician'
      } else if (nextLevel === 2) {
        nextRole = 'charge_nurse'
        isFinalEscalation = true
      } else {
        // Already at max escalation level
        console.log(`Case ${triageCase.id} at max escalation level`)
        continue
      }

      // Find next-level staff
      const { data: nextStaff } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', nextRole)
        .eq('zone', triageCase.assigned_zone || 'A')
        .limit(1)

      // If no zone-specific staff, get any available
      let targetUserId = nextStaff?.[0]?.user_id
      if (!targetUserId) {
        const { data: anyStaff } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', nextRole)
          .limit(1)
        targetUserId = anyStaff?.[0]?.user_id
      }

      if (!targetUserId) {
        console.log(`No ${nextRole} available for case ${triageCase.id}`)
        continue
      }

      // Mark current assignment as escalated
      await supabase
        .from('routing_assignments')
        .update({ status: 'escalated' })
        .eq('id', assignment.id)

      // Create new assignment with next level
      const nextDeadline = new Date(now.getTime() + ESCALATION_TIMEOUT_MS)
      
      const { data: newAssignment, error: insertError } = await supabase
        .from('routing_assignments')
        .insert({
          triage_case_id: triageCase.id,
          assigned_to: targetUserId,
          assigned_role: nextRole,
          escalation_level: nextLevel,
          escalation_deadline: isFinalEscalation ? null : nextDeadline.toISOString(),
          status: 'pending'
        })
        .select()
        .single()

      if (insertError) {
        console.error(`Failed to create escalation for case ${triageCase.id}:`, insertError)
        continue
      }

      // Insert escalation event
      await supabase.from('escalation_events').insert({
        triage_case_id: triageCase.id,
        from_user: assignment.assigned_to,
        from_role: assignment.assigned_role,
        to_user: targetUserId,
        to_role: nextRole,
        reason: 'timeout',
        notes: `Escalated due to no acknowledgment within deadline`
      })

      // Update triage case escalation status
      const escalationStatus = nextLevel === 1 ? 'level_1' : nextLevel === 2 ? 'level_2' : 'level_3'
      await supabase
        .from('triage_cases')
        .update({
          escalation_status: escalationStatus,
          assigned_to: targetUserId
        })
        .eq('id', triageCase.id)

      // Insert audit log (using service role, so no user_id check)
      // Note: We'll skip audit log here since service role doesn't have a user_id

      // Broadcast escalation alert
      const channel = supabase.channel('alerts')
      await channel.send({
        type: 'broadcast',
        event: 'escalation',
        payload: {
          triageCaseId: triageCase.id,
          patientId: triageCase.patient_id,
          esiLevel: triageCase.validated_esi,
          escalationLevel: nextLevel,
          assignedTo: targetUserId,
          assignedRole: nextRole,
          patient: {
            firstName: triageCase.patients?.first_name,
            lastName: triageCase.patients?.last_name,
            chiefComplaint: triageCase.patients?.chief_complaint
          }
        }
      })

      results.push({
        triageCaseId: triageCase.id,
        fromLevel: currentLevel,
        toLevel: nextLevel,
        toRole: nextRole,
        toUser: targetUserId
      })
    }

    console.log(`Processed ${results.length} escalations`)

    return new Response(
      JSON.stringify({
        success: true,
        processedAt: now.toISOString(),
        escalations: results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Check escalations error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
