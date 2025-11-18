import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as OTPAuth from "npm:otpauth@9";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email } = await req.json();
    
    // Generate secret
    const secret = new OTPAuth.Secret({ size: 32 });
    const secretBase32 = secret.base32;
    
    // Generate recovery codes
    const recoveryCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      recoveryCodes.push(code);
    }
    
    // Hash recovery codes
    const encoder = new TextEncoder();
    const recoveryCodesHashed = await Promise.all(
      recoveryCodes.map(async (code) => {
        const data = encoder.encode(code);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(hash)));
      })
    );
    
    // Store in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { error } = await supabase
      .from('user_2fa')
      .upsert({
        user_id: userId,
        secret: secretBase32,
        enabled: false,
        recovery_codes_hashed: recoveryCodesHashed,
      });
    
    if (error) throw error;
    
    return new Response(
      JSON.stringify({
        secret: secretBase32,
        recoveryCodes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
