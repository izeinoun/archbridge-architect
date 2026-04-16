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

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { project_id, message, action } = await req.json();

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle different actions
    if (action === 'history') {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('project_id', project_id)
        .order('created_at', { ascending: true })
        .limit(50);
      return new Response(JSON.stringify({ messages: messages || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'clear') {
      await supabase.from('chat_messages').delete().eq('project_id', project_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'summarize') {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('project_id', project_id)
        .order('created_at', { ascending: true })
        .limit(50);

      const convText = (messages || []).map(m => `${m.role}: ${m.content}`).join('\n\n');
      const summaryResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${aiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'Summarize this conversation into a structured brief with key decisions, open questions, and action items.' },
            { role: 'user', content: convText },
          ],
        }),
      });
      const summaryResult = await summaryResp.json();
      return new Response(JSON.stringify({ summary: summaryResult.choices?.[0]?.message?.content || '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Main chat flow - streaming
    if (!message) {
      return new Response(JSON.stringify({ error: 'message required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Fetch project info
    const { data: project } = await supabase.from('projects').select('*').eq('id', project_id).single();
    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch members
    const { data: members } = await supabase
      .from('project_members')
      .select('role, user_id')
      .eq('project_id', project_id);
    
    const memberIds = (members || []).map(m => m.user_id).filter(Boolean);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', memberIds.length > 0 ? memberIds : ['none']);
    
    const memberList = (members || []).map(m => {
      const p = (profiles || []).find(pr => pr.id === m.user_id);
      return `${p?.full_name || 'Unknown'} (${m.role})`;
    }).join(', ');

    // 3. Fetch parsed documents
    const { data: docs } = await supabase
      .from('documents')
      .select('file_name, file_type, extracted_text, created_at')
      .eq('project_id', project_id)
      .eq('parse_status', 'done')
      .order('created_at', { ascending: false });

    // 4. Fetch insights
    const { data: insights } = await supabase
      .from('project_insights')
      .select('*')
      .eq('project_id', project_id)
      .single();

    // 5. Fetch master system prompt
    const { data: configRow } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'master_system_prompt')
      .single();
    const masterPrompt = configRow?.config_value || 'You are ArchBridge AI.';

    // 6. Build insights summary
    let insightsSummary = '';
    if (insights) {
      const pp = insights.pain_points as any;
      const cg = insights.customer_goals as any;
      const sc = insights.solution_components as any;
      const ps = insights.problem_statement;

      insightsSummary = `=== CURRENT INSIGHTS SUMMARY ===\n`;
      if (ps) {
        const parsed = typeof ps === 'string' ? JSON.parse(ps) : ps;
        insightsSummary += `Problem Statement: ${(parsed?.statement || '').substring(0, 500)}\n\n`;
      }
      if (pp?.items) {
        insightsSummary += `Pain Points (${pp.items.length} identified):\n${pp.items.map((p: any) => `- ${p.title}: ${(p.description || '').substring(0, 100)}`).join('\n')}\n\n`;
      }
      if (cg?.items) {
        insightsSummary += `Customer Goals (${cg.items.length} identified):\n${cg.items.map((g: any) => `- ${g.title} (${g.priority})`).join('\n')}\n\n`;
      }
      if (sc?.components) {
        insightsSummary += `Solution Components (${sc.components.length}):\n${sc.components.map((c: any) => `- ${c.name} (${c.type}, ${c.build_vs_buy})`).join('\n')}\n`;
        if (sc.gaps?.length) {
          insightsSummary += `Gaps: ${sc.gaps.map((g: any) => g.description).join('; ')}\n`;
        }
      }
    }

    // 7. Build document context
    let docContext = '';
    let totalChars = 0;
    const maxTotal = 80000;
    const usedDocs = [];
    for (const doc of (docs || []).slice(0, 10)) {
      const text = (doc.extracted_text || '').substring(0, 8000);
      if (totalChars + text.length > maxTotal) break;
      usedDocs.push(doc);
      totalChars += text.length;
      docContext += `=== DOCUMENT: ${doc.file_name} (${doc.file_type}) ===\n${text}\n=== END DOCUMENT ===\n\n`;
    }

    const docIndex = (docs || []).map(d =>
      `- ${d.file_name} (${d.file_type}, uploaded ${d.created_at})\n  Preview: ${(d.extracted_text || '').substring(0, 200)}`
    ).join('\n');

    // 8. Build system prompt
    const systemPrompt = `${masterPrompt}

=== PROJECT CONTEXT ===
Project: ${project.name}
Customer: ${project.customer_name}
Status: ${project.status}
Team: ${memberList}

${insightsSummary}

=== AVAILABLE DOCUMENTS (${(docs || []).length} total) ===
${docIndex}

${docContext}

=== CHAT BEHAVIOR RULES ===
You are in a live conversation with the project team.
- Answer questions directly and conversationally, but always cite your sources when making factual claims about the customer.
- When referencing a document, name it explicitly.
- When referencing an insight (pain point, goal, etc.), reference it by its title and note it was AI-generated from the documents.
- If asked something you cannot answer from the available documents or insights, say so clearly and suggest what additional information would help.
- You can be asked to: explain findings, compare options, critique a proposed solution, draft a section of a document, answer questions about Penguin AI products, or role-play as a customer stakeholder to pressure-test assumptions.
- If the user asks you to critique something, be honest and direct. Identify weaknesses, assumptions, and risks — not just strengths.
- Format responses for readability: use bullet points, headers, and bold text where it helps. Keep responses focused.`;

    // 9. Fetch conversation history (last 20)
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(20);

    const historyMessages = (history || []).reverse().map(m => ({
      role: m.role as string,
      content: m.content,
    }));

    // 10. Save user message
    await supabase.from('chat_messages').insert({
      project_id, user_id: user.id, role: 'user', content: message,
    });

    // 11. Stream from AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${aiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: message },
        ],
        stream: true,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiResponse.text();
      throw new Error(`AI error: ${aiResponse.status} ${errText}`);
    }

    // Transform the SSE stream
    const reader = aiResponse.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = '';

    const stream = new ReadableStream({
      async pull(controller) {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Extract sources from full content
            const docNames = (docs || []).map(d => d.file_name);
            const mentionedSources = docNames.filter(name => fullContent.includes(name));
            const sources = mentionedSources.map(name => ({ doc_name: name, mentioned_in_context: true }));

            // Save assistant message
            await supabase.from('chat_messages').insert({
              project_id, user_id: user.id, role: 'assistant', content: fullContent, sources,
            });

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          let newlineIdx;
          while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content })}\n\n`));
              }
            } catch { /* partial JSON, skip */ }
          }
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });

  } catch (err: any) {
    console.error('Chat error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
