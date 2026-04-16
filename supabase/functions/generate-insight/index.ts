import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INSIGHT_PROMPTS: Record<string, string> = {
  pain_points: `Based on all the project documents provided, identify the customer's pain points. These are problems, frustrations, inefficiencies, or challenges the customer is currently experiencing in their operations.

Respond ONLY with valid JSON in this exact structure:
{
  "items": [
    {
      "id": "pp_1",
      "title": "Short pain point title",
      "description": "Full description of the pain point",
      "category": "operational|financial|compliance|technical|staffing",
      "severity": "critical|high|medium|low",
      "source_document": "exact file name",
      "evidence": "direct quote or close paraphrase from document",
      "reasoning": "why this evidence indicates this pain point",
      "confidence": "high|medium|low"
    }
  ],
  "summary": "One paragraph synthesizing the overall pain point theme",
  "total_count": 5,
  "generated_at": "${new Date().toISOString()}"
}`,

  customer_goals: `Identify the customer's stated and implied strategic and operational goals from all project documents.

Respond ONLY with valid JSON:
{
  "items": [
    {
      "id": "goal_1",
      "title": "Goal title",
      "description": "Full description",
      "type": "strategic|operational|financial|compliance|technical",
      "timeframe": "immediate|short_term|long_term|undefined",
      "priority": "must_have|nice_to_have|aspirational",
      "source_document": "exact file name",
      "evidence": "quote or paraphrase",
      "reasoning": "analytical reasoning",
      "confidence": "high|medium|low"
    }
  ],
  "summary": "Synthesized summary of customer goals",
  "generated_at": "${new Date().toISOString()}"
}`,

  problem_statement: `Generate a single, synthesized problem statement that captures the core challenge this customer engagement is solving.

Respond ONLY with valid JSON:
{
  "statement": "The formal problem statement (3-5 sentences)",
  "context": "Background context that frames the problem",
  "scope": "What is in scope for this engagement",
  "out_of_scope": "What is explicitly out of scope or unclear",
  "key_stakeholders": ["list of stakeholder types mentioned"],
  "sources_used": ["list of document names used"],
  "reasoning": "Explanation of how you synthesized this statement",
  "confidence": "high|medium|low",
  "generated_at": "${new Date().toISOString()}"
}`,

  current_workflows: `Map the customer's current operational workflows as described in the project documents.

Respond ONLY with valid JSON:
{
  "workflows": [
    {
      "id": "wf_1",
      "name": "Workflow name",
      "description": "What this workflow accomplishes",
      "steps": [
        {
          "step_number": 1,
          "action": "What happens in this step",
          "actor": "Who or what system performs this step",
          "pain_points": ["any pain points at this step"]
        }
      ],
      "systems_involved": ["list of systems or tools mentioned"],
      "volume_metrics": "Any volume or throughput data mentioned",
      "current_challenges": ["challenges specific to this workflow"],
      "source_document": "file name",
      "evidence": "quote or paraphrase",
      "reasoning": "reasoning",
      "confidence": "high|medium|low"
    }
  ],
  "summary": "Overall summary of current state",
  "generated_at": "${new Date().toISOString()}"
}`,

  solution_components: `Based on the customer's pain points and goals, recommend specific Penguin AI Digital Worker products and any custom components needed. Be explicit about what product capability addresses what customer need. Flag any gaps where current Penguin AI products do not fully address a customer need.

Respond ONLY with valid JSON:
{
  "components": [
    {
      "id": "sol_1",
      "name": "Component name",
      "type": "penguin_product|custom_build|integration|partner",
      "penguin_product": "Prior Authorization|HCC Coding|Claims Scrubbing|Denials Management|Appeals Management|null",
      "description": "What this component does",
      "addresses_pain_points": ["pp_1", "pp_2"],
      "addresses_goals": ["goal_1"],
      "technical_requirements": ["list of technical needs"],
      "dependencies": ["other component IDs"],
      "build_vs_buy": "exists|needs_config|needs_custom|gap",
      "effort_estimate": "low|medium|high|unknown",
      "source_document": "file name",
      "evidence": "quote or paraphrase",
      "reasoning": "why this component addresses this need",
      "confidence": "high|medium|low"
    }
  ],
  "gaps": [
    {
      "description": "Gap description",
      "impact": "high|medium|low",
      "suggested_approach": "How to fill this gap"
    }
  ],
  "summary": "Overall solution narrative",
  "generated_at": "${new Date().toISOString()}"
}`,

  implementation_roadmap: `Generate a phased implementation roadmap based on the solution components, customer goals, and any constraints or timelines mentioned in the documents.

Respond ONLY with valid JSON:
{
  "phases": [
    {
      "phase_number": 1,
      "name": "Phase name",
      "duration_weeks": 8,
      "description": "What is accomplished in this phase",
      "deliverables": ["list of deliverables"],
      "components_implemented": ["component IDs"],
      "milestones": ["key milestones"],
      "dependencies": ["what must be true before this phase starts"],
      "risks": [
        {
          "description": "Risk description",
          "probability": "high|medium|low",
          "impact": "high|medium|low",
          "mitigation": "Suggested mitigation"
        }
      ],
      "success_criteria": ["how we know this phase succeeded"]
    }
  ],
  "total_duration_weeks": 24,
  "critical_path": "Description of the critical path",
  "assumptions": ["list of planning assumptions"],
  "sources_used": ["document names"],
  "reasoning": "How you arrived at this phasing",
  "generated_at": "${new Date().toISOString()}"
}`,

  expected_outcomes: `Define the measurable outcomes and business value this solution will deliver, tied directly to the customer's stated goals.

Respond ONLY with valid JSON:
{
  "outcomes": [
    {
      "id": "out_1",
      "title": "Outcome title",
      "description": "Full description of the outcome",
      "category": "efficiency|cost_reduction|revenue|compliance|quality|staffing",
      "metric": "How this will be measured",
      "baseline": "Current state metric if known",
      "target": "Target metric after implementation",
      "timeframe": "When this outcome is expected",
      "linked_goals": ["goal IDs"],
      "linked_components": ["component IDs"],
      "source_document": "file name",
      "evidence": "quote or paraphrase",
      "reasoning": "why this outcome is realistic",
      "confidence": "high|medium|low"
    }
  ],
  "roi_narrative": "Overall ROI and value narrative",
  "total_outcomes_count": 5,
  "generated_at": "${new Date().toISOString()}"
}`,
};

const INSIGHT_DB_COLUMNS: Record<string, string> = {
  pain_points: 'pain_points',
  customer_goals: 'customer_goals',
  problem_statement: 'problem_statement',
  current_workflows: 'current_workflows',
  solution_components: 'solution_components',
  implementation_roadmap: 'implementation_roadmap',
  expected_outcomes: 'expected_outcomes',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const aiApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { project_id, insight_type } = await req.json();

    if (!project_id || !insight_type) {
      return new Response(JSON.stringify({ error: 'project_id and insight_type required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!INSIGHT_PROMPTS[insight_type]) {
      return new Response(JSON.stringify({ error: `Invalid insight_type: ${insight_type}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch parsed documents
    const { data: docs } = await supabase
      .from('documents')
      .select('file_name, file_type, extracted_text, created_at')
      .eq('project_id', project_id)
      .eq('parse_status', 'done')
      .order('created_at', { ascending: false });

    if (!docs || docs.length === 0) {
      return new Response(JSON.stringify({ error: 'No parsed documents found. Upload and parse documents first.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Assemble document context (limit to 80k chars total, max 10 docs)
    let totalChars = 0;
    const maxTotal = 80000;
    const maxPerDoc = 8000;
    let contextWarning = '';
    const usedDocs = [];

    for (const doc of docs.slice(0, 10)) {
      const text = (doc.extracted_text || '').substring(0, maxPerDoc);
      if (totalChars + text.length > maxTotal) break;
      usedDocs.push(doc);
      totalChars += text.length;
    }

    if (docs.length > 10) {
      contextWarning = `\n\nNOTE: Analysis based on ${usedDocs.length} most recent documents out of ${docs.length} total due to context limits.`;
    }

    const documentContext = usedDocs.map(doc => {
      const text = (doc.extracted_text || '').substring(0, maxPerDoc);
      return `=== DOCUMENT: ${doc.file_name} (Type: ${doc.file_type}, Uploaded: ${doc.created_at}) ===\n${text}\n=== END DOCUMENT ===`;
    }).join('\n\n');

    // 3. Fetch master system prompt
    const { data: configRow } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'master_system_prompt')
      .single();

    const masterPrompt = configRow?.config_value || 'You are ArchBridge AI, an expert Solutions Architect.';

    const systemPrompt = `${masterPrompt}

EVIDENCE REQUIREMENT: Every finding you produce MUST include:
- source_document: the exact file name the finding came from
- evidence: a direct quote or close paraphrase from that document (20-100 words) that supports this finding
- reasoning: your analytical reasoning chain explaining WHY this evidence leads to this finding (2-4 sentences)
- confidence: 'high' | 'medium' | 'low' based on how explicitly this is stated in the documents vs inferred

Never make a claim that is not traceable to at least one source document.
If you cannot find evidence for something, say so explicitly rather than inferring without basis.`;

    const userPrompt = `Here are the project documents:\n\n${documentContext}${contextWarning}\n\n${INSIGHT_PROMPTS[insight_type]}`;

    // 4. Call AI
    const aiResponse = await fetch('https://ai.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI call failed: ${aiResponse.status} ${errText}`);
    }

    const aiResult = await aiResponse.json();
    let content = aiResult.choices?.[0]?.message?.content || '';

    // Strip markdown code fences
    content = content.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ 
        error: 'AI response could not be parsed as JSON', 
        raw: content.substring(0, 500) 
      }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Store in project_insights
    const column = INSIGHT_DB_COLUMNS[insight_type];
    
    // Check if insights row exists
    const { data: existing } = await supabase
      .from('project_insights')
      .select('id')
      .eq('project_id', project_id)
      .single();

    if (existing) {
      // For problem_statement, store the JSON as text
      const updateData: any = { last_generated_at: new Date().toISOString() };
      if (insight_type === 'problem_statement') {
        updateData[column] = JSON.stringify(parsed);
      } else {
        updateData[column] = parsed;
      }
      await supabase.from('project_insights').update(updateData).eq('project_id', project_id);
    } else {
      const insertData: any = {
        project_id,
        last_generated_at: new Date().toISOString(),
      };
      if (insight_type === 'problem_statement') {
        insertData[column] = JSON.stringify(parsed);
      } else {
        insertData[column] = parsed;
      }
      await supabase.from('project_insights').insert(insertData);
    }

    return new Response(JSON.stringify({ 
      status: 'done', 
      insight_type,
      data: parsed,
      documents_analyzed: usedDocs.length,
      warning: contextWarning || undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
