import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as OTPAuth from "https://esm.sh/otpauth@9";
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

    const { token } = await req.json();
    const userId = user.id;

    // Get user's 2FA settings
    const { data: twoFactorData, error: fetchError } = await supabase
      .from('user_2fa')
      .select('secret, recovery_codes_hashed')
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // First try TOTP verification
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(twoFactorData.secret),
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token, window: 1 });

    if (delta !== null) {
      // TOTP code is valid - disable 2FA
      const { error } = await supabase
        .from('user_2fa')
        .update({ enabled: false })
        .eq('user_id', userId);
      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try recovery code
    if (token.length === 8 && twoFactorData.recovery_codes_hashed) {
      const encoder = new TextEncoder();
      const tokenData = encoder.encode(token.toUpperCase());
      const hash = await crypto.subtle.digest('SHA-256', tokenData);
      const tokenHash = btoa(String.fromCharCode(...new Uint8Array(hash)));

      const codeIndex = twoFactorData.recovery_codes_hashed.indexOf(tokenHash);
      if (codeIndex !== -1) {
        // Valid recovery code - disable 2FA and remove used code
        const updatedCodes = [...twoFactorData.recovery_codes_hashed];
        updatedCodes.splice(codeIndex, 1);

        const { error } = await supabase
          .from('user_2fa')
          .update({ enabled: false, recovery_codes_hashed: updatedCodes })
          .eq('user_id', userId);
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    throw new Error('Invalid code');
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
