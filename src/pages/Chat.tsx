import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedGroupChat } from '@/components/chat/UnifiedGroupChat';
import { PrivateChat } from '@/components/chat/PrivateChat';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageCircle } from 'lucide-react';

export default function Chat() {
  const { role } = useAuth();
  const [selectedPrivateRoom, setSelectedPrivateRoom] = useState<string | null>(null);

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
    <div className="container max-w-7xl mx-auto p-4 h-[calc(100vh-8rem)]">
      <Tabs defaultValue="group" className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Chat</h1>
          <TabsList>
            <TabsTrigger value="group" className="gap-2">
              <Users className="h-4 w-4" />
              Community
            </TabsTrigger>
            <TabsTrigger value="private" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Private
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="group" className="flex-1 mt-0">
          <Card className="h-full overflow-hidden">
            <UnifiedGroupChat />
          </Card>
        </TabsContent>

        <TabsContent value="private" className="flex-1 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            <div className="md:col-span-1">
              <PrivateChat onSelectRoom={setSelectedPrivateRoom} />
            </div>
            <div className="md:col-span-2">
              {selectedPrivateRoom ? (
                <Card className="h-full p-4">
                  <p className="text-muted-foreground text-center py-12">
                    Private chat room selected: {selectedPrivateRoom}
                  </p>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a conversation to start messaging</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
