import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, Navigate } from 'react-router-dom';
import { useUsersPaginated } from '@/hooks/useUsersPaginated';
import { UserWithRole } from '@/components/admin/users/UserCard';
import { UserList } from '@/components/admin/users/UserList';
import { UserSearchFilters } from '@/components/admin/users/UserSearchFilters';
import { UserDetailsDialog } from '@/components/admin/users/UserDetailsDialog';
import { DisableUserDialog } from '@/components/admin/users/DisableUserDialog';
import { EditRoleDialog } from '@/components/admin/EditRoleDialog';
import { AddUserDialog } from '@/components/admin/AddUserDialog';
import { AuditLogPanel } from '@/components/admin/AuditLogPanel';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, KeyRound, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function UserManagement() {
  const { role: currentUserRole, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('search') || '';
  const roleFilter = searchParams.get('role') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [viewingUser, setViewingUser] = useState<UserWithRole | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [disablingUser, setDisablingUser] = useState<UserWithRole | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const isSuperAdmin = currentUserRole === 'super_admin';

  // Only super admins can access this page
  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const { data, isLoading } = useUsersPaginated({
    search: searchQuery,
    roleFilter,
    page,
  });

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || (key === 'page' && value === '1') || (key === 'role' && value === 'all')) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke('delete-user', { body: { userId } });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('User deleted permanently');
      setDeletingUser(null);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to delete user'),
  });

  const toggleDisableMutation = useMutation({
    mutationFn: async ({ userId, disable, reason }: { userId: string; disable: boolean; reason: string }) => {
      const { error } = await supabase.rpc('toggle_user_disabled', {
        p_actor_id: currentUser?.id,
        p_target_id: userId,
        p_disable: disable,
        p_reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success(variables.disable ? 'User account disabled' : 'User account enabled');
      setDisablingUser(null);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update user status'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId, newPassword },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
      setResetPasswordUser(null);
      setNewPassword('');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to reset password'),
  });

  return (
    <div className="container max-w-7xl mx-auto p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Super Admin • {data?.totalCount || 0} registered users
            </p>
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <AddUserDialog />
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UserSearchFilters
            searchQuery={searchQuery}
            onSearchChange={(value) => updateParams({ search: value, page: '1' })}
            roleFilter={roleFilter}
            onRoleFilterChange={(value) => updateParams({ role: value, page: '1' })}
          />

          <UserList
            users={data?.users}
            isLoading={isLoading}
            isSuperAdmin={isSuperAdmin}
            onView={setViewingUser}
            onEdit={setEditingUser}
            onDelete={setDeletingUser}
            onToggleDisable={setDisablingUser}
            onResetPassword={setResetPasswordUser}
            page={page}
            totalPages={data?.totalPages || 1}
            onPageChange={(newPage) => updateParams({ page: String(newPage) })}
            totalCount={data?.totalCount || 0}
          />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogPanel />
        </TabsContent>
      </Tabs>

      {/* Edit Role Dialog */}
      {editingUser && (
        <EditRoleDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
        />
      )}

      {/* View Details Dialog */}
      <UserDetailsDialog
        user={viewingUser}
        open={!!viewingUser}
        onOpenChange={(open) => !open && setViewingUser(null)}
      />

      {/* Disable Dialog */}
      <DisableUserDialog
        user={disablingUser}
        open={!!disablingUser}
        onOpenChange={(open) => !open && setDisablingUser(null)}
        onConfirm={(reason) => {
          if (disablingUser) {
            toggleDisableMutation.mutate({
              userId: disablingUser.user_id,
              disable: !disablingUser.is_disabled,
              reason,
            });
          }
        }}
        isPending={toggleDisableMutation.isPending}
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deletingUser?.full_name}</strong> and all their data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingUser && deleteUserMutation.mutate(deletingUser.user_id)}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => { if (!open) { setResetPasswordUser(null); setNewPassword(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{resetPasswordUser?.full_name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setResetPasswordUser(null); setNewPassword(''); }}>
                Cancel
              </Button>
              <Button
                onClick={() => resetPasswordUser && resetPasswordMutation.mutate({ userId: resetPasswordUser.user_id, newPassword })}
                disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
