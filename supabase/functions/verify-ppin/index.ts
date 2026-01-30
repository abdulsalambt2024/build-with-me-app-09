import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple hash function for PPIN verification
async function hashPPIN(ppin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ppin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { ppin } = await req.json();
    if (!ppin || ppin.length !== 4) {
      return new Response(
        JSON.stringify({ error: 'Invalid PPIN format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get stored PPIN
    const { data: ppinData, error: ppinError } = await supabase
      .from('user_ppin')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (ppinError || !ppinData) {
      return new Response(
        JSON.stringify({ error: 'PPIN not set up' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if locked
    if (ppinData.locked_until && new Date(ppinData.locked_until) > new Date()) {
      return new Response(
        JSON.stringify({ error: 'Account temporarily locked' }),
        { status: 423, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the provided PPIN and compare
    const hashedPpin = await hashPPIN(ppin);
    
    if (hashedPpin !== ppinData.ppin_hash) {
      // Increment failed attempts
      const newAttempts = (ppinData.failed_attempts || 0) + 1;
      const updateData: any = { 
        failed_attempts: newAttempts,
        updated_at: new Date().toISOString()
      };
      
      // Lock after 5 failed attempts for 15 minutes
      if (newAttempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      await supabase
        .from('user_ppin')
        .update(updateData)
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({ success: false, error: 'Invalid PPIN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset failed attempts on success
    await supabase
      .from('user_ppin')
      .update({ 
        failed_attempts: 0, 
        locked_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
