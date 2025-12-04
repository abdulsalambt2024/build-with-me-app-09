import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, faqContext, conversationHistory } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    
    // Build context from FAQ
    const faqText = faqContext?.map((faq: any) => 
      `Q: ${faq.question}\nA: ${faq.answer}`
    ).join('\n\n') || '';
    
    const systemPrompt = `You are PARIVARTAN Assistant, a helpful chatbot for the PARIVARTAN community app. 
Your role is to help users understand and use the app features effectively.

Available features in PARIVARTAN:
- Posts: Create and share updates with the community
- Events: Browse and register for upcoming events
- Announcements: View important announcements from admins
- Donations: Support campaigns and make donations
- AI Studio: Generate and enhance images (Members/Admins only)
- Chat: Real-time group communication (Members/Admins only)
- Achievements: Earn badges for your contributions
- Tasks: View and manage assigned tasks

FAQ Knowledge Base:
${faqText}

Be friendly, concise, and helpful. If you don't know something, suggest contacting an admin.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(conversationHistory || []),
          { role: 'user', content: message }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'API credits exhausted. Please contact admin.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      throw new Error(`AI API request failed: ${response.status}`);
    }

    const data = await response.json();
    const botResponse = data.choices?.[0]?.message?.content || 'Sorry, I could not process that request.';
    
    return new Response(
      JSON.stringify({ response: botResponse }),
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
