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
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      throw new Error('GEMINI_API_KEY is not configured');
    }
    
    const faqText = faqContext || '';
    
    const systemPrompt = `You are PARI, a friendly and helpful AI assistant for the PARIVARTAN community app. 
Your name is PARI (short for PARIVARTAN Assistant Robot Intelligence). Always introduce yourself as PARI when asked.

Available features in PARIVARTAN:
- Posts: Create and share updates (Members/Admins only)
- Events: Browse and register for events
- Announcements: View important announcements
- Donations: Support campaigns via UPI
- AI Studio: Generate images (Members/Admins only)
- Chat: Real-time group messaging (Members/Admins only)
- Achievements: Earn badges for contributions
- Tasks: View and manage assigned tasks
- Profile: Update profile information
- Settings: Customize notifications, privacy, theme

User Roles:
- Viewer: Can view content but cannot create or chat
- Member: Can create posts, chat, use AI Studio
- Admin: Can manage content, users, events
- Super Admin: Full access including user management

FAQ Knowledge Base:
${faqText}

Guidelines:
- Always introduce yourself as PARI when asked your name
- Be friendly, warm, and supportive
- Keep responses concise but helpful
- Suggest contacting admin if unsure
- Help users navigate the app
- Encourage community engagement`;

    // Build conversation for Gemini
    const contents: { role: string; parts: { text: string }[] }[] = [];
    
    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }
    
    // Add current message with system context
    const userMessage = conversationHistory?.length === 0 
      ? `${systemPrompt}\n\nUser: ${message}`
      : message;
    
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    console.log('Calling Gemini API with message:', message);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.95,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API response received');
    
    const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
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
