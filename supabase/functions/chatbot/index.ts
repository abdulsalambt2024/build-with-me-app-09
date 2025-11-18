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
    
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: systemPrompt + '\n\nUser: ' + message
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process that request.';
    
    return new Response(
      JSON.stringify({ response: botResponse }),
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
