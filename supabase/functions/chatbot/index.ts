import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      throw new Error('OPENAI_API_KEY is not configured');
    }
    
    // Build context from FAQ
    const faqText = faqContext || '';
    
    const systemPrompt = `You are PARIVARTAN Assistant, a friendly and helpful AI chatbot for the PARIVARTAN community app. 
Your role is to help users understand and use the app features effectively. Be conversational, helpful, and concise.

Available features in PARIVARTAN:
- Posts: Create and share updates with the community (Members/Admins only can create)
- Events: Browse and register for upcoming events
- Announcements: View important announcements from admins
- Donations: Support campaigns and make donations via UPI
- AI Studio: Generate and enhance images, create posters (Members/Admins only)
- Chat: Real-time group and private messaging (Members/Admins only)
- Achievements: Earn badges for your contributions
- Tasks: View and manage assigned tasks
- Profile: Update your profile information and avatar
- Settings: Customize notifications, privacy, and theme

User Roles:
- Viewer: Can view content but cannot create or chat
- Member: Can create posts, chat, use AI Studio
- Admin: Can manage content, users, events, and more
- Super Admin: Full access to all features including user management

FAQ Knowledge Base:
${faqText}

Guidelines:
- Be friendly and use a warm, supportive tone
- Keep responses concise but helpful
- If you don't know something specific, suggest contacting an admin
- Help users navigate the app and understand features
- Encourage community engagement`;

    // Build messages for OpenAI
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    
    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    console.log('Calling OpenAI API with message:', message);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    const botResponse = data.choices?.[0]?.message?.content || 
      'I apologize, but I could not process that request. Please try again.';
    
    return new Response(
      JSON.stringify({ response: botResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Chatbot error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});