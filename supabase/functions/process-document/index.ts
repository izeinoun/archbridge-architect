import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { document_id } = await req.json();
    if (!document_id) {
      return new Response(JSON.stringify({ error: 'document_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch document record
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update status to processing
    await supabase.from('documents').update({ parse_status: 'processing' }).eq('id', document_id);

    try {
      let extractedText = '';
      const fileType = doc.file_type;
      const filePath = doc.file_path;

      // Download file from storage
      const { data: fileData, error: dlError } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (dlError || !fileData) {
        throw new Error(`Failed to download file: ${dlError?.message}`);
      }

      if (fileType === 'txt') {
        // Plain text - read directly
        extractedText = await fileData.text();
      } else if (fileType === 'pdf' || fileType === 'docx' || fileType === 'pptx') {
        // Use AI to extract text from binary formats
        const bytes = new Uint8Array(await fileData.arrayBuffer());
        let binary = '';
        const CHUNK_SIZE = 8192;
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64 = btoa(binary);
        
        const mimeMap: Record<string, string> = {
          pdf: 'application/pdf',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };

        const aiResponse = await fetch('https://ai.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'file',
                    file: {
                      filename: doc.file_name,
                      content_type: mimeMap[fileType] || 'application/octet-stream',
                      data: base64,
                    },
                  },
                  {
                    type: 'text',
                    text: `Extract ALL text content from this ${fileType.toUpperCase()} document. Preserve the structure, headings, bullet points, and any tabular data. If this contains diagrams or images, describe them. Return ONLY the extracted text, no commentary.`,
                  },
                ],
              },
            ],
            max_tokens: 8000,
          }),
        });

        if (!aiResponse.ok) {
          const errBody = await aiResponse.text();
          throw new Error(`AI extraction failed: ${aiResponse.status} ${errBody}`);
        }

        const aiResult = await aiResponse.json();
        extractedText = aiResult.choices?.[0]?.message?.content || '';
      } else if (['jpeg', 'jpg', 'png', 'webp', 'image'].includes(fileType)) {
        // Image - use vision
        const bytes = new Uint8Array(await fileData.arrayBuffer());
        let binary = '';
        const CHUNK_SIZE = 8192;
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64 = btoa(binary);
        
        const mimeMap: Record<string, string> = {
          jpeg: 'image/jpeg', jpg: 'image/jpeg',
          png: 'image/png', webp: 'image/webp', image: 'image/jpeg',
        };

        const aiResponse = await fetch('https://ai.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeMap[fileType] || 'image/jpeg'};base64,${base64}`,
                    },
                  },
                  {
                    type: 'text',
                    text: 'This image is from a healthcare solution architecture project. Extract and transcribe ALL visible text. If this is a diagram or workflow, describe the components, connections, and flow in detail. If it is a screenshot, describe what system or interface is shown and what information it contains.',
                  },
                ],
              },
            ],
            max_tokens: 4000,
          }),
        });

        if (!aiResponse.ok) {
          throw new Error(`AI vision failed: ${aiResponse.status}`);
        }

        const aiResult = await aiResponse.json();
        extractedText = aiResult.choices?.[0]?.message?.content || '';
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Update document with extracted text
      await supabase.from('documents').update({
        extracted_text: extractedText,
        parse_status: 'done',
        parse_error: null,
      }).eq('id', document_id);

      return new Response(JSON.stringify({ status: 'done', text_length: extractedText.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (parseErr: any) {
      await supabase.from('documents').update({
        parse_status: 'error',
        parse_error: parseErr.message || 'Unknown parsing error',
      }).eq('id', document_id);

      return new Response(JSON.stringify({ status: 'error', error: parseErr.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
