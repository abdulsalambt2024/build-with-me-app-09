import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface EditRoleDialogProps {
  user: {
    id: string;
    user_id: string;
    full_name: string | null;
    role: 'viewer' | 'member' | 'admin' | 'super_admin';
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditRoleDialog({ user, open, onOpenChange }: EditRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<string>(user.role);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleUpdateRole = async () => {
    setIsUpdating(true);
    try {
      // Delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.user_id);

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.user_id,
          role: selectedRole as 'viewer' | 'member' | 'admin' | 'super_admin',
        });

      if (error) throw error;

      toast({
        title: 'Role updated successfully',
        description: `${user.full_name || 'User'} is now ${selectedRole.replace('_', ' ')}`,
      });

      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Failed to update role',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Role</DialogTitle>
          <DialogDescription>
            Update the role for {user.full_name || 'this user'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Role'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
