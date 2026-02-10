import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Trash2, ClipboardList, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const rolePriority: Record<string, number> = {
  super_admin: 4, admin: 3, member: 2, viewer: 1,
};

export default function TaskAssignment() {
  const { role, user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', assigned_to: '', deadline: '', priority: 'medium',
  });
  const queryClient = useQueryClient();

  // Fetch users (exclude viewers) sorted by role priority
  const { data: allUsers } = useQuery({
    queryKey: ['task-assignment-users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name');
      if (error) throw error;

      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rolesErr) throw rolesErr;

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]));
      
      return profiles
        ?.map(p => ({ ...p, role: roleMap.get(p.user_id) || 'viewer' }))
        .filter(u => u.role !== 'viewer')
        .sort((a, b) => {
          const diff = (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0);
          return diff !== 0 ? diff : (a.full_name || '').localeCompare(b.full_name || '');
        }) || [];
    }
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['admin-tasks-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set(data.flatMap(t => [t.assigned_to, t.assigned_by]))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return data.map(task => ({
        ...task,
        assigned_to_name: profileMap.get(task.assigned_to) || 'Unknown',
        assigned_by_name: profileMap.get(task.assigned_by) || 'Unknown',
      }));
    }
  });

  const createTask = useMutation({
    mutationFn: async (task: typeof formData) => {
      if (!currentUser) throw new Error('Not authenticated');
      const { error } = await supabase.from('tasks').insert({
        ...task,
        assigned_by: currentUser.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks-assignment'] });
      toast.success('Task assigned successfully');
      setOpen(false);
      setFormData({ title: '', description: '', assigned_to: '', deadline: '', priority: 'medium' });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create task'),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('tasks').update({
        status,
        ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks-assignment'] });
      toast.success('Task updated');
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks-assignment'] });
      toast.success('Task deleted');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.assigned_to || !formData.deadline) {
      toast.error('Please fill all required fields');
      return;
    }
    createTask.mutate(formData);
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Task Assignment</h1>
            <p className="text-muted-foreground text-sm">Assign and manage tasks for team members</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Assign Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign New Task</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Assign To *</Label>
                <Select value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {allUsers?.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.full_name || 'Unknown'} ({u.role.replace('_', ' ')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Viewers cannot be assigned tasks</p>
              </div>
              <div>
                <Label>Deadline *</Label>
                <Input type="datetime-local" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} required />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={createTask.isPending} className="w-full">
                {createTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Task
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-3">
          {tasks?.map(task => (
            <Card key={task.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{task.title}</h3>
                    {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                  </div>
                  <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                    {task.priority}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="space-y-1">
                    <p>Assigned to: <span className="text-foreground">{task.assigned_to_name}</span></p>
                    <p>Assigned by: <span className="text-foreground">{task.assigned_by_name}</span></p>
                    <p>Due: {new Date(task.deadline).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={task.status}
                      onValueChange={(v) => updateStatus.mutate({ id: task.id, status: v })}
                    >
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => { if (confirm('Delete this task?')) deleteTask.mutate(task.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!tasks || tasks.length === 0) && (
            <p className="text-center text-muted-foreground py-8">No tasks assigned yet</p>
          )}
        </div>
      )}
    </div>
  );
}
