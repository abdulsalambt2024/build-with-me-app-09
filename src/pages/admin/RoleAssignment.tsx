import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowRight, Loader2, Search, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'viewer' | 'member' | 'admin' | 'super_admin';

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
}

export default function RoleAssignment() {
  const { role: currentUserRole } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('viewer');
  const [isUpdating, setIsUpdating] = useState(false);

  const isSuperAdmin = currentUserRole === 'super_admin';

  const { data: users, isLoading } = useQuery({
    queryKey: ['role-assignment-users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .order('full_name');
      if (error) throw error;

      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rolesErr) throw rolesErr;

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role as AppRole]));
      
      return profiles?.map(p => ({
        ...p,
        role: roleMap.get(p.user_id) || 'viewer' as AppRole,
      })) || [];
    }
  });

  const filteredUsers = users?.filter(u => 
    !search || (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const getAvailableRoles = (): { value: AppRole; label: string }[] => {
    const roles: { value: AppRole; label: string }[] = [
      { value: 'viewer', label: 'Viewer' },
      { value: 'member', label: 'Member' },
      { value: 'admin', label: 'Admin' },
    ];
    if (isSuperAdmin) {
      roles.push({ value: 'super_admin', label: 'Super Admin' });
    }
    return roles;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive' as const;
      case 'admin': return 'default' as const;
      case 'member': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  const handleEditRole = (user: UserWithRole) => {
    // Admins cannot modify super_admin roles
    if (user.role === 'super_admin' && !isSuperAdmin) {
      toast.error('Only Super Admins can modify Super Admin roles');
      return;
    }
    setEditingUser(user);
    setSelectedRole(user.role);
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('set-user-role', {
        body: { userId: editingUser.user_id, role: selectedRole },
      });
      if (error) throw error;

      toast.success(`${editingUser.full_name || 'User'} is now ${selectedRole.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['role-assignment-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setEditingUser(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 pb-24">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Role Assignment</h1>
            <p className="text-muted-foreground text-sm">
              {isSuperAdmin ? 'Assign any role to any user' : 'Assign viewer, member, or admin roles'}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-3">
          {filteredUsers?.map(user => (
            <Card key={user.user_id} className="hover:border-primary/50 transition-colors">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {(user.full_name || '?')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{user.full_name || 'Unknown User'}</p>
                    <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                      {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditRole(user)}
                  disabled={user.role === 'super_admin' && !isSuperAdmin}
                >
                  Change Role
                </Button>
              </CardContent>
            </Card>
          ))}
          {filteredUsers?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          )}
        </div>
      )}

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role — {editingUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Current:</span>
              <Badge variant={getRoleBadgeVariant(editingUser?.role || 'viewer')}>
                {editingUser?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
              {selectedRole !== editingUser?.role && (
                <>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant={getRoleBadgeVariant(selectedRole)}>
                    {selectedRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingUser(null)} disabled={isUpdating}>Cancel</Button>
              <Button onClick={handleUpdateRole} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Role'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
