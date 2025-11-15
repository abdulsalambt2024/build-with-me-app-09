import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AIUsage {
  id: string;
  user_id: string;
  feature_type: string;
  prompt: string | null;
  result_url: string | null;
  created_at: string;
}

export function useAIUsage() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ai-usage', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('ai_usage')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIUsage[];
    },
    enabled: !!user,
  });
}

export function useGenerateImage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ prompt }: { prompt: string }) => {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          modalities: ['image', 'text']
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl) {
        throw new Error('No image generated');
      }

      // Track usage
      if (user) {
        await supabase.from('ai_usage').insert({
          user_id: user.id,
          feature_type: 'image_generation',
          prompt,
          result_url: imageUrl
        });
      }

      return imageUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
    },
  });
}

export function useEnhanceImage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ imageUrl, instruction }: { imageUrl: string; instruction: string }) => {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: instruction
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ],
          modalities: ['image', 'text']
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enhance image');
      }

      const data = await response.json();
      const enhancedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!enhancedImageUrl) {
        throw new Error('No enhanced image generated');
      }

      // Track usage
      if (user) {
        await supabase.from('ai_usage').insert({
          user_id: user.id,
          feature_type: 'image_enhancement',
          prompt: instruction,
          result_url: enhancedImageUrl
        });
      }

      return enhancedImageUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
    },
  });
}
