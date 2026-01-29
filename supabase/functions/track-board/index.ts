import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TrackBoardRequest {
  esiLevels?: number[]
  zones?: string[]
  statuses?: string[]
  page?: number
  pageSize?: number
}

// Target wait times in milliseconds
const ESI_WAIT_TARGETS_MS: Record<number, number> = {
  1: 0,
  2: 600000, // 10 minutes
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

    // Parse query parameters
    let filters: TrackBoardRequest = {}
    if (req.method === 'POST') {
      filters = await req.json()
    } else {
      const url = new URL(req.url)
      if (url.searchParams.has('esiLevels')) {
        filters.esiLevels = url.searchParams.get('esiLevels')!.split(',').map(Number)
      }
      if (url.searchParams.has('zones')) {
        filters.zones = url.searchParams.get('zones')!.split(',')
      }
      if (url.searchParams.has('statuses')) {
        filters.statuses = url.searchParams.get('statuses')!.split(',')
      }
      filters.page = parseInt(url.searchParams.get('page') || '1')
      filters.pageSize = parseInt(url.searchParams.get('pageSize') || '50')
    }

    const page = filters.page || 1
    const pageSize = Math.min(filters.pageSize || 50, 100)
    const offset = (page - 1) * pageSize

    // Build query
    let query = supabase
      .from('triage_cases')
      .select(`
        *,
        patients!inner(
          id, mrn, first_name, last_name, date_of_birth, gender,
          chief_complaint, arrival_time, status, is_returning, allergies
        ),
        routing_assignments(*)
      `, { count: 'exact' })
      .not('validated_esi', 'is', null)
      .in('status', ['validated', 'assigned', 'acknowledged', 'in_treatment'])

    // Apply ESI filter - default to ESI 3-5 for track board
    if (filters.esiLevels && filters.esiLevels.length > 0) {
      query = query.in('validated_esi', filters.esiLevels.map(String))
    } else {
      query = query.in('validated_esi', ['3', '4', '5'])
    }

    // Apply zone filter
    if (filters.zones && filters.zones.length > 0) {
      query = query.in('assigned_zone', filters.zones)
    }

    // Apply status filter
    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses)
    }

    // Order by ESI level (ascending) then by creation time
    query = query
      .order('validated_esi', { ascending: true })
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1)

    const { data: cases, error: queryError, count } = await query

    if (queryError) {
      console.error('Track board query error:', queryError)
      throw queryError
    }

    const now = Date.now()

    // Process cases with wait time calculations
    const processedCases = (cases || []).map(tc => {
      const esiLevel = parseInt(tc.validated_esi || '3')
      const createdAt = new Date(tc.created_at).getTime()
      const waitTimeMs = now - createdAt
      const targetMs = ESI_WAIT_TARGETS_MS[esiLevel] || ESI_WAIT_TARGETS_MS[3]
      const isOverdue = waitTimeMs > targetMs
      const overdueByMs = isOverdue ? waitTimeMs - targetMs : 0

      // Calculate age
      const dob = tc.patients?.date_of_birth
      let age = null
      if (dob) {
        const birthDate = new Date(dob)
        const today = new Date()
        age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
      }

      return {
        id: tc.id,
        patientId: tc.patient_id,
        patient: {
          id: tc.patients?.id,
          mrn: tc.patients?.mrn,
          firstName: tc.patients?.first_name,
          lastName: tc.patients?.last_name,
          age,
          gender: tc.patients?.gender,
          chiefComplaint: tc.patients?.chief_complaint,
          arrivalTime: tc.patients?.arrival_time,
          isReturning: tc.patients?.is_returning,
          allergies: tc.patients?.allergies
        },
        esiLevel,
        status: tc.status,
        assignedZone: tc.assigned_zone,
        assignedTo: tc.assigned_to,
        acknowledgedAt: tc.acknowledged_at,
        escalationStatus: tc.escalation_status,
        sbar: tc.ai_sbar_situation ? {
          situation: tc.ai_sbar_situation,
          background: tc.ai_sbar_background,
          assessment: tc.ai_sbar_assessment,
          recommendation: tc.ai_sbar_recommendation
        } : null,
        waitTimeMs,
        waitTimeFormatted: formatWaitTime(waitTimeMs),
        targetMs,
        isOverdue,
        overdueByMs,
        overdueFormatted: isOverdue ? formatWaitTime(overdueByMs) : null,
        createdAt: tc.created_at,
        validatedAt: tc.validated_at
      }
    })

    // Calculate summary stats
    const summary = {
      total: count || 0,
      byESI: {
        3: processedCases.filter(c => c.esiLevel === 3).length,
        4: processedCases.filter(c => c.esiLevel === 4).length,
        5: processedCases.filter(c => c.esiLevel === 5).length
      },
      overdue: processedCases.filter(c => c.isOverdue).length,
      avgWaitTimeMs: processedCases.length > 0
        ? Math.round(processedCases.reduce((sum, c) => sum + c.waitTimeMs, 0) / processedCases.length)
        : 0
    }

    return new Response(
      JSON.stringify({
        success: true,
        cases: processedCases,
        summary,
        pagination: {
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
          totalCount: count || 0
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Track board error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function formatWaitTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`
  }
  return `${minutes}m`
}
