import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DIAGRAM_PROMPTS: Record<string, string> = {
  solution_overview: `Generate a flowchart (flowchart TD) showing the complete solution architecture for this engagement. Include:
- Customer systems on the left (as a subgraph)
- Penguin AI Digital Workers in the center (as a subgraph)
- Data outputs/integrations on the right
- Arrows showing data/workflow direction with brief labels
Base this on the solution_components insights for this project.`,
  data_flow: `Generate a flowchart (flowchart LR) showing how data flows through the solution from source to destination. Show:
- Data sources (EHR, clearinghouse, payer portals, etc.)
- Processing steps (Penguin AI Digital Workers)
- Data outputs and destinations
- Any validation or decision points`,
  integration_architecture: `Generate a flowchart showing system integrations. Show:
- Customer source systems
- Integration methods (API, FHIR, HL7, file transfer, etc.)
- Penguin AI platform components
- Target systems
- Security boundaries using subgraphs`,
  current_state_workflow: `Generate a flowchart showing the customer's CURRENT manual workflow as described in the project documents. Show pain points as diamond-shaped decision nodes with warning labels.`,
  future_state_workflow: `Generate a flowchart showing the FUTURE STATE workflow after Penguin AI implementation. Show automation touchpoints distinctly. Compare against current state where documented.`,
  component_dependency: `Generate a graph showing component dependencies using flowchart TD. Each solution component is a node. Arrows show dependencies (A depends on B). Group by implementation phase using subgraphs.`,
  implementation_phases: `Generate a Gantt chart showing the implementation phases and key milestones. Use the implementation_roadmap insights.`,
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

    const body = await req.json();

    // List diagrams
    if (body.action === 'list') {
      const { data: diagrams } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('project_id', body.project_id)
        .eq('document_type', 'diagram')
        .order('created_at', { ascending: false });
      return new Response(JSON.stringify({ diagrams: diagrams || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search action
    if (body.action === 'search') {
      const { query, scope = 'all' } = body;
      if (!query || query.length < 2) {
        return new Response(JSON.stringify({ results: [], total: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user's project IDs
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id);
      
      const projectIds = [
        ...new Set([
          ...(memberRows || []).map(m => m.project_id),
          ...(ownedProjects || []).map(p => p.id),
        ].filter(Boolean))
      ];

      if (projectIds.length === 0) {
        return new Response(JSON.stringify({ results: [], total: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const results: any[] = [];
      const q = `%${query}%`;

      if (scope === 'all' || scope === 'projects') {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, customer_name, description, updated_at')
          .in('id', projectIds)
          .or(`name.ilike.${q},customer_name.ilike.${q},description.ilike.${q}`)
          .limit(5);
        for (const p of (projects || [])) {
          const text = `${p.name} ${p.customer_name} ${p.description || ''}`;
          results.push({
            type: 'project', id: p.id, project_id: p.id, project_name: p.name,
            title: p.name, excerpt: getExcerpt(text, query),
            url: `/projects/${p.id}`, updated_at: p.updated_at,
          });
        }
      }

      if (scope === 'all' || scope === 'documents') {
        const { data: docs } = await supabase
          .from('documents')
          .select('id, project_id, file_name, extracted_text, created_at')
          .in('project_id', projectIds)
          .or(`file_name.ilike.${q},extracted_text.ilike.${q}`)
          .limit(5);
        for (const d of (docs || [])) {
          const { data: proj } = await supabase.from('projects').select('name').eq('id', d.project_id).single();
          results.push({
            type: 'document', id: d.id, project_id: d.project_id,
            project_name: proj?.name || '', title: d.file_name,
            excerpt: getExcerpt(d.extracted_text || d.file_name, query),
            url: `/projects/${d.project_id}/documents`, updated_at: d.created_at,
          });
        }
      }

      if (scope === 'all' || scope === 'generated') {
        const { data: genDocs } = await supabase
          .from('generated_documents')
          .select('id, project_id, title, content, created_at')
          .in('project_id', projectIds)
          .neq('document_type', 'critique')
          .or(`title.ilike.${q},content.ilike.${q}`)
          .limit(5);
        for (const g of (genDocs || [])) {
          const { data: proj } = await supabase.from('projects').select('name').eq('id', g.project_id).single();
          results.push({
            type: 'generated_doc', id: g.id, project_id: g.project_id,
            project_name: proj?.name || '', title: g.title,
            excerpt: getExcerpt(g.content || g.title, query),
            url: `/projects/${g.project_id}/generated`, updated_at: g.created_at,
          });
        }
      }

      return new Response(JSON.stringify({ results: results.slice(0, 20), total: results.length, query, scope }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Dashboard action
    if (body.action === 'dashboard') {
      const { data: memberRows } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id);

      const projectIds = [
        ...new Set([
          ...(memberRows || []).map(m => m.project_id),
          ...(ownedProjects || []).map(p => p.id),
        ].filter(Boolean))
      ];

      const { data: allProjects } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds.length > 0 ? projectIds : ['none']);

      const projects = allProjects || [];
      const projectsWithHealth = [];

      for (const p of projects) {
        const { count: docCount } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('project_id', p.id);
        const { count: genDocCount } = await supabase.from('generated_documents').select('*', { count: 'exact', head: true }).eq('project_id', p.id).neq('document_type', 'critique');
        const { count: memberCount } = await supabase.from('project_members').select('*', { count: 'exact', head: true }).eq('project_id', p.id);
        const { data: insightsRow } = await supabase.from('project_insights').select('*').eq('project_id', p.id).single();

        let insightsGenerated = 0;
        if (insightsRow) {
          const fields = ['pain_points', 'customer_goals', 'problem_statement', 'current_workflows', 'solution_components', 'implementation_roadmap', 'expected_outcomes'];
          for (const f of fields) {
            const val = (insightsRow as any)[f];
            if (val && ((typeof val === 'string' && val.length > 2) || (typeof val === 'object' && Object.keys(val).length > 0))) {
              insightsGenerated++;
            }
          }
        }

        // Health score calculation
        const dc = docCount || 0;
        const docScore = dc === 0 ? 0 : dc <= 2 ? 10 : dc <= 5 ? 18 : 25;
        const insightScore = insightsGenerated * 5;
        const gc = genDocCount || 0;
        const genScore = gc === 0 ? 0 : gc === 1 ? 8 : gc === 2 ? 14 : 20;
        const daysSince = (Date.now() - new Date(p.updated_at || p.created_at).getTime()) / 86400000;
        const recencyScore = daysSince <= 7 ? 10 : daysSince <= 30 ? 6 : daysSince <= 90 ? 3 : 0;
        const mc = (memberCount || 0) + 1;
        const teamScore = mc <= 1 ? 4 : mc <= 3 ? 7 : 10;
        const healthScore = docScore + insightScore + genScore + recencyScore + teamScore;

        projectsWithHealth.push({
          ...p,
          health_score: healthScore,
          health_breakdown: {
            documents: { score: docScore, max: 25 },
            insights: { score: insightScore, max: 35 },
            generated_docs: { score: genScore, max: 20 },
            recency: { score: recencyScore, max: 10 },
            team: { score: teamScore, max: 10 },
          },
          member_count: (memberCount || 0) + 1,
          document_count: dc,
          insights_generated: insightsGenerated,
          generated_doc_count: gc,
        });
      }

      const { count: totalDocs } = await supabase.from('documents').select('*', { count: 'exact', head: true }).in('project_id', projectIds.length > 0 ? projectIds : ['none']);
      const { count: totalGenDocs } = await supabase.from('generated_documents').select('*', { count: 'exact', head: true }).in('project_id', projectIds.length > 0 ? projectIds : ['none']).neq('document_type', 'critique');

      return new Response(JSON.stringify({
        total_projects: projects.length,
        active_projects: projects.filter(p => p.status === 'active').length,
        total_documents: totalDocs || 0,
        total_generated_docs: totalGenDocs || 0,
        projects_with_health: projectsWithHealth,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate diagram
    const { project_id, diagram_type, user_instructions } = body;

    if (!project_id || !diagram_type || !DIAGRAM_PROMPTS[diagram_type]) {
      return new Response(JSON.stringify({ error: 'project_id and valid diagram_type required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch project + insights
    const { data: project } = await supabase.from('projects').select('*').eq('id', project_id).single();
    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: insights } = await supabase.from('project_insights').select('*').eq('project_id', project_id).single();

    const { data: docs } = await supabase
      .from('documents')
      .select('file_name, extracted_text')
      .eq('project_id', project_id)
      .eq('parse_status', 'done')
      .limit(5);

    let context = `Project: ${project.name}\nCustomer: ${project.customer_name}\n\n`;
    if (insights) context += `Insights:\n${JSON.stringify(insights, null, 2).substring(0, 10000)}\n\n`;
    for (const doc of (docs || [])) {
      context += `Document: ${doc.file_name}\n${(doc.extracted_text || '').substring(0, 2000)}\n\n`;
    }

    const systemPrompt = `You are generating Mermaid diagram syntax for a healthcare AI solution architecture. You must output ONLY valid Mermaid syntax that will render correctly in Mermaid v10+.

Rules for Mermaid output:
- Start with the diagram type declaration
- Use clear, short node labels (avoid special characters: no parentheses inside labels, no quotes unless escaped)
- For flowcharts use: flowchart TD or flowchart LR
- For sequence diagrams use: sequenceDiagram
- For Gantt charts use: gantt
- Group related components using subgraph blocks
- Use alphanumeric + underscore node IDs only
- Limit to 20 nodes maximum for readability
- Do NOT use emojis in the syntax
- Output ONLY the Mermaid syntax - no explanation, no markdown fences, no preamble`;

    const userPrompt = `${context}\n\n${DIAGRAM_PROMPTS[diagram_type]}\n\nAdditional instructions: ${user_instructions || 'None'}`;

    // Generate Mermaid
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${aiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI error: ${aiResponse.status} ${errText}`);
    }

    const aiResult = await aiResponse.json();
    let mermaidSource = aiResult.choices?.[0]?.message?.content || '';
    mermaidSource = mermaidSource.replace(/^```(?:mermaid)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();

    // Generate description
    const descResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${aiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: `Describe what this diagram shows in 2-3 sentences for someone who cannot see it:\n\n${mermaidSource}` }],
        max_tokens: 200,
      }),
    });
    const descResult = await descResp.json();
    const description = descResult.choices?.[0]?.message?.content || '';

    // Version
    const { data: existing } = await supabase
      .from('generated_documents')
      .select('version')
      .eq('project_id', project_id)
      .eq('document_type', 'diagram')
      .order('version', { ascending: false })
      .limit(1);
    const nextVersion = ((existing?.[0]?.version as number) || 0) + 1;

    const typeLabels: Record<string, string> = {
      solution_overview: 'Solution Overview',
      data_flow: 'Data Flow',
      integration_architecture: 'Integration Architecture',
      current_state_workflow: 'Current State Workflow',
      future_state_workflow: 'Future State Workflow',
      component_dependency: 'Component Dependencies',
      implementation_phases: 'Implementation Timeline',
    };

    const { data: savedDoc } = await supabase
      .from('generated_documents')
      .insert({
        project_id,
        generated_by: user.id,
        document_type: 'diagram',
        title: `${typeLabels[diagram_type] || diagram_type} - ${project.customer_name} - v${nextVersion}`,
        content: mermaidSource,
        diagram_description: description,
        version: nextVersion,
      })
      .select()
      .single();

    return new Response(JSON.stringify({
      diagram_id: savedDoc?.id,
      mermaid_source: mermaidSource,
      description,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Diagram/dashboard/search error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getExcerpt(text: string, query: string): string {
  if (!text) return '';
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.substring(0, 100);
  const start = Math.max(0, idx - 50);
  const end = Math.min(text.length, idx + query.length + 50);
  let excerpt = text.substring(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';
  return excerpt;
}
