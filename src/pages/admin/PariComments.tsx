import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

export default function PariComments() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');

  if (role !== 'super_admin') return <Navigate to="/admin" replace />;

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['pari-comments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pari_comments')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase.from('pari_comments').insert({
        message,
        display_order: comments.length,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pari-comments'] });
      setNewMessage('');
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('pari_comments').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pari-comments'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pari_comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pari-comments'] });
      toast.success('Comment deleted');
    },
  });

  const activeCount = comments.filter(c => c.is_active).length;

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <MessageCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">PARI Speech Bubbles</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active • Rotates every 5 seconds on homepage
          </p>
        </div>
      </div>

      {/* Add new */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add New Message</CardTitle>
          <CardDescription className="text-xs">PARI will display these messages in rotation</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={e => { e.preventDefault(); if (newMessage.trim()) addMutation.mutate(newMessage.trim()); }} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type a message for PARI..."
              maxLength={100}
            />
            <Button type="submit" disabled={!newMessage.trim() || addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : comments.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No comments yet</CardContent></Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className={`transition-opacity ${!comment.is_active ? 'opacity-50' : ''}`}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <p className="flex-1 text-sm font-medium">{comment.message}</p>
                <Badge variant={comment.is_active ? 'default' : 'secondary'} className="text-[10px]">
                  {comment.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Switch
                  checked={comment.is_active}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: comment.id, is_active: checked })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(comment.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
