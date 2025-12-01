import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { payment_id, user_confirmed } = await req.json();

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch transaction
    const { data: transaction, error: fetchError } = await supabaseClient
      .from('payment_transactions')
      .select('*')
      .eq('payment_id', payment_id)
      .single();

    if (fetchError || !transaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If user confirmed payment manually (fallback for UPI without webhooks)
    if (user_confirmed && transaction.status === 'pending') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Update to success (admin review required)
      const { error: updateError } = await supabaseAdmin
        .from('payment_transactions')
        .update({
          status: 'success',
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create donation record
      const donorName = transaction.gateway_response?.donor_name || 'Anonymous';
      const isAnonymous = transaction.gateway_response?.is_anonymous || false;
      const message = transaction.gateway_response?.message || null;

      const { data: donationData, error: donationError } = await supabaseAdmin
        .from('donations')
        .insert({
          campaign_id: transaction.campaign_id,
          user_id: transaction.user_id,
          amount: transaction.amount,
          donor_name: donorName,
          is_anonymous: isAnonymous,
          message,
          payment_method: transaction.payment_gateway,
          payment_id: transaction.payment_id,
        })
        .select()
        .single();

      if (donationError) {
        console.error('Error creating donation:', donationError);
        return new Response(
          JSON.stringify({ error: 'Failed to create donation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update transaction with donation_id
      await supabaseAdmin
        .from('payment_transactions')
        .update({ donation_id: donationData.id })
        .eq('id', transaction.id);

      // Generate receipt
      const receiptNumber = `RCP-${Date.now()}-${donationData.id.substring(0, 8)}`;
      await supabaseAdmin
        .from('donation_receipts')
        .insert({
          donation_id: donationData.id,
          receipt_number: receiptNumber,
        });

      return new Response(
        JSON.stringify({ success: true, status: 'success', donation_id: donationData.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return current status
    return new Response(
      JSON.stringify({ status: transaction.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-payment function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
