import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the calling user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, project_id, role } = await req.json();

    if (!email || !project_id) {
      return new Response(JSON.stringify({ error: "email and project_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const memberRole = role || "contributor";

    // Verify caller is the project owner
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: project, error: projError } = await adminClient
      .from("projects")
      .select("owner_id")
      .eq("id", project_id)
      .single();

    if (projError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (project.owner_id !== caller.id) {
      return new Response(JSON.stringify({ error: "Only the project owner can invite members" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the target user by email
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      return new Response(JSON.stringify({ error: "Failed to look up users" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUser = users.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!targetUser) {
      return new Response(JSON.stringify({ error: "No user found with that email. They must register first." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUser.id === caller.id) {
      return new Response(JSON.stringify({ error: "You are already the owner of this project" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already a member
    const { data: existing } = await adminClient
      .from("project_members")
      .select("id")
      .eq("project_id", project_id)
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "User is already a member of this project" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert member
    const { error: insertError } = await adminClient
      .from("project_members")
      .insert({ project_id, user_id: targetUser.id, role: memberRole });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: targetUser.id, full_name: targetUser.user_metadata?.full_name || targetUser.email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
