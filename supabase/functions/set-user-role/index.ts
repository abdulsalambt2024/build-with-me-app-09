import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "viewer" | "member" | "admin" | "super_admin";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as any).message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId: targetUserId, role: targetRole } = (await req.json()) as {
      userId?: string;
      role?: AppRole;
    };

    if (!targetUserId || !targetRole) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isSuperAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "super_admin",
    });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!(isSuperAdmin || isAdmin)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetRole === "super_admin" && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only super admins can assign super_admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Use a single SQL statement to atomically update the role
    // This avoids race conditions between delete and insert
    const { error: updateError } = await supabase.rpc("set_user_role_atomic", {
      acting_user_id: user.id,
      target_user_id: targetUserId,
      new_role: targetRole,
    });

    if (updateError) {
      const msg = updateError.message || "";

      // Only fall back when the RPC truly doesn't exist.
      // For permission/validation errors we must not bypass the RPC.
      const rpcMissing =
        msg.includes("Could not find the function") &&
        msg.includes("set_user_role_atomic");

      if (!rpcMissing) throw updateError;

      console.log("RPC not found, using fallback approach:", msg);

      // Fallback: keep exactly one active role per user
      const { error: deleteErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId);
      if (deleteErr) throw deleteErr;

      const { error: insertErr } = await supabase
        .from("user_roles")
        .insert({ user_id: targetUserId, role: targetRole });
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in set-user-role:", error);
    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
