import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeRequest {
    patientId: string
    fileUrl: string
    fileType: string
    documentId: string
}

Deno.serve(async (req: Request) => {
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

        const { patientId, fileUrl, fileType, documentId } = await req.json() as AnalyzeRequest

        if (!patientId || !fileUrl || !documentId) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Fetch the image to get base64
        const imageResponse = await fetch(fileUrl)
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
        }
        const arrayBuffer = await imageResponse.arrayBuffer()
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

        // Prepare Gemini Request
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiApiKey) {
            throw new Error('GEMINI_API_KEY not configured')
        }

        const payload = {
            contents: [{
                parts: [
                    { text: "Analyze this medical document. Identify key findings, potential diagnosis, suggested vital signs if visible, and a summary. Return a valid JSON object." },
                    {
                        inline_data: {
                            mime_type: fileType || "image/jpeg",
                            data: base64Image
                        }
                    }
                ]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        findings: { type: "ARRAY", items: { type: "STRING" } },
                        diagnosis: { type: "STRING" },
                        vitals: {
                            type: "OBJECT",
                            properties: {
                                bp: { type: "STRING" },
                                hr: { type: "STRING" },
                                spo2: { type: "STRING" }
                            }
                        },
                        summary: { type: "STRING" }
                    }
                }
            }
        }

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }
        )

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text()
            console.error("Gemini Error:", errText)
            throw new Error(`Gemini API Failed: ${errText}`)
        }

        const geminiData = await geminiResponse.json()
        const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
        const analysisResult = JSON.parse(aiText)

        // Update the database record
        await supabase
            .from('patient_documents')
            .update({ analysis_result: analysisResult })
            .eq('id', documentId)

        return new Response(
            JSON.stringify({ success: true, analysis: analysisResult }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Analysis error:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
