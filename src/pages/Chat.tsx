import { useState } from 'react';
import { useChat, useChatRoom } from '@/hooks/useChat';
import { ChatRoomList } from '@/components/chat/ChatRoomList';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatInput } from '@/components/chat/ChatInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function Chat() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const { rooms, roomsLoading } = useChat();
  const { messages, messagesLoading, sendMessage } = useChatRoom(selectedRoomId);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage.mutateAsync({ content });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="container max-w-7xl mx-auto p-4 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Chat</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100%-5rem)]">
        {/* Chat Rooms List */}
        <Card className="md:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {roomsLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading conversations...</p>
              </div>
            ) : (
              <ChatRoomList
                rooms={rooms || []}
                selectedRoomId={selectedRoomId}
                onSelectRoom={setSelectedRoomId}
              />
            )}
          </CardContent>
        </Card>

        {/* Chat Messages */}
        <Card className="md:col-span-2 flex flex-col">
          {selectedRoomId ? (
            <>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Loading messages...</p>
                  </div>
                ) : (
                  <ChatMessages messages={messages || []} />
                )}
              </CardContent>
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={sendMessage.isPending}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
