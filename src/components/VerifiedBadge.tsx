import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VerifiedBadgeProps {
  userId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function VerifiedBadge({ userId, className = '', size = 'sm' }: VerifiedBadgeProps) {
  // Fetch verification badge from database
  const { data: badge } = useQuery({
    queryKey: ['verification-badge', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('verification_badges')
        .select('badge_type')
        .eq('user_id', userId)
        .single();
      return data;
    },
    enabled: !!userId
  });

  if (!badge) return null;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const badgeColor = badge.badge_type === 'blue' ? '#1DA1F2' : '#25D366';
  const sizeClass = sizeClasses[size];

  // Instagram/WhatsApp style verified tick badge
  return (
    <svg
      viewBox="0 0 24 24"
      className={`inline-block ${sizeClass} ${className}`}
      style={{ verticalAlign: 'middle' }}
    >
      {/* Badge background */}
      <path
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91c-1.31.66-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.66 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.66 2.19-1.91 2.19-3.34z"
        fill={badgeColor}
      />
      {/* White checkmark */}
      <path
        d="M9.5 16.5L5.5 12.5L7 11L9.5 13.5L17 6L18.5 7.5L9.5 16.5Z"
        fill="white"
      />
    </svg>
  );
}