import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface VerifiedBadgeProps {
  userId?: string;
  role?: 'viewer' | 'member' | 'admin' | 'super_admin';
  className?: string;
}

export function VerifiedBadge({ userId, role, className = '' }: VerifiedBadgeProps) {
  const { user: currentUser, role: currentRole } = useAuth();
  
  // Determine the role to display
  const displayRole = role || (userId === currentUser?.id ? currentRole : undefined);
  
  if (!displayRole || displayRole === 'viewer') return null;
  
  if (displayRole === 'super_admin' || displayRole === 'admin') {
    return (
      <CheckCircle2 
        className={`inline-block text-blue-500 ${className}`} 
        size={16}
        fill="currentColor"
      />
    );
  }
  
  if (displayRole === 'member') {
    return (
      <CheckCircle2 
        className={`inline-block text-green-500 ${className}`} 
        size={16}
        fill="currentColor"
      />
    );
  }
  
  return null;
}
