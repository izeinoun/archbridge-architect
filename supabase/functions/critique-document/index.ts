import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const aiApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: 'document_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch document
    const { data: genDoc } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('id', document_id)
      .single();
    if (!genDoc) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch project docs for cross-reference
    const { data: docs } = await supabase
      .from('documents')
      .select('file_name, file_type, extracted_text')
      .eq('project_id', genDoc.project_id)
      .eq('parse_status', 'done')
      .order('created_at', { ascending: false })
      .limit(10);

    let docContext = '';
    for (const doc of (docs || [])) {
      const text = (doc.extracted_text || '').substring(0, 5000);
      docContext += `=== SOURCE: ${doc.file_name} ===\n${text}\n=== END ===\n\n`;
    }

    // Fetch master prompt
    const { data: configRow } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'master_system_prompt')
      .single();

    const systemPrompt = `${configRow?.config_value || 'You are ArchBridge AI.'}

You are now in CRITIQUE MODE. Your role is to critically review this document as a senior solutions architect and healthcare IT expert who is NOT the author. Be direct, honest, and specific.

Do NOT be diplomatic to the point of being useless. If something is wrong, vague, unsupported, or risky — say so clearly.

Your critique must be evidence-based:
- For every issue you identify, cite EITHER the specific text in the document that is problematic, OR a document from the project that contradicts or complicates what the doc claims.
- For every gap you identify, explain what information is missing and why it matters.`;

    const userPrompt = `Here are the project source documents for cross-referencing:

${docContext}

Now critique the following ${genDoc.document_type} document:

${genDoc.content}

Evaluate across these dimensions and respond ONLY with valid JSON:
{
  "overall_score": 85,
  "overall_assessment": "One paragraph honest summary",
  "dimensions": [
    {"name": "Completeness", "score": 80, "assessment": "...", "issues": []},
    {"name": "Evidence Quality", "score": 75, "assessment": "...", "issues": []},
    {"name": "Customer Alignment", "score": 90, "assessment": "...", "issues": []},
    {"name": "Feasibility", "score": 70, "assessment": "...", "issues": []},
    {"name": "Clarity", "score": 85, "assessment": "...", "issues": []},
    {"name": "Risk Coverage", "score": 60, "assessment": "...", "issues": []}
  ],
  "critical_issues": [
    {
      "severity": "critical|high|medium|low",
      "title": "Issue title",
      "description": "Detailed description",
      "location": "Section or text excerpt",
      "evidence": "What contradicts or complicates this",
      "recommendation": "Specific fix"
    }
  ],
  "strengths": [{"title": "...", "description": "..."}],
  "missing_sections": [{"section": "...", "importance": "high|medium|low", "why": "..."}],
  "recommended_improvements": ["..."],
  "customer_ready": false,
  "customer_ready_rationale": "..."
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${aiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI error: ${aiResponse.status} ${errText}`);
    }

    const aiResult = await aiResponse.json();
    let content = aiResult.choices?.[0]?.message?.content || '';
    content = content.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: 'AI response could not be parsed', raw: content.substring(0, 500) }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Save critique as generated_document
    const { data: savedCritique } = await supabase
      .from('generated_documents')
      .insert({
        project_id: genDoc.project_id,
        generated_by: user.id,
        document_type: 'critique',
        title: `Critique — ${genDoc.title}`,
        content: JSON.stringify(parsed),
        parent_document_id: document_id,
        version: 1,
      })
      .select()
      .single();

    return new Response(JSON.stringify({ critique: parsed, critique_id: savedCritique?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Critique error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
