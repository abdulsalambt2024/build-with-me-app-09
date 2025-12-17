import { useAuth } from '@/contexts/AuthContext';
import { UnifiedGroupChat } from '@/components/chat/UnifiedGroupChat';
import { Card } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';

export default function Chat() {
  const { role } = useAuth();

  // Only members, admins, super_admins can access chat
  if (role === 'viewer') {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <Card className="p-12 text-center">
          <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Chat Access Restricted</h2>
          <p className="text-muted-foreground">
            Chat is only available for Members, Admins, and Super Admins.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-2 sm:p-4 h-[calc(100vh-8rem)]">
      <Card className="h-full overflow-hidden">
        <UnifiedGroupChat />
      </Card>
    </div>
  );
}
