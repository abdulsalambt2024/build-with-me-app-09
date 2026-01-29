import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function UserManagement() {
  const { role: currentUserRole, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get params from URL
  const searchQuery = searchParams.get('search') || '';
  const roleFilter = searchParams.get('role') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [viewingUser, setViewingUser] = useState<UserWithRole | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [disablingUser, setDisablingUser] = useState<UserWithRole | null>(null);

  const { data, isLoading } = useUsersPaginated({
    search: searchQuery,
    roleFilter,
    page,
  });

  // Update URL params
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
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('User deleted permanently');
      setDeletingUser(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove user');
    },
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
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user status');
    },
  });

  const isSuperAdmin = currentUserRole === 'super_admin';

  return (
    <div className="container max-w-7xl mx-auto p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions ({data?.totalCount || 0} users)
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <AddUserDialog />
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
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
            page={page}
            totalPages={data?.totalPages || 1}
            onPageChange={(newPage) => updateParams({ page: String(newPage) })}
            totalCount={data?.totalCount || 0}
          />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="audit">
            <AuditLogPanel />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      {editingUser && (
        <EditRoleDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
        />
      )}

      <UserDetailsDialog
        user={viewingUser}
        open={!!viewingUser}
        onOpenChange={(open) => !open && setViewingUser(null)}
      />

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

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {deletingUser?.full_name}? 
              This action cannot be undone. They will be removed from the database 
              and must re-register to use the app again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingUser && deleteUserMutation.mutate(deletingUser.user_id)}
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
