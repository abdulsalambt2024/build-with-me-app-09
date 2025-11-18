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
    const { userId, token } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user's 2FA settings
    const { data: twoFactorData, error: fetchError } = await supabase
      .from('user_2fa')
      .select('secret')
      .eq('user_id', userId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Verify token
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(twoFactorData.secret),
      digits: 6,
      period: 30,
    });
    
    const delta = totp.validate({ token, window: 1 });
    
    if (delta === null) {
      throw new Error('Invalid token');
    }
    
    // Disable 2FA
    const { error } = await supabase
      .from('user_2fa')
      .update({ enabled: false })
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
