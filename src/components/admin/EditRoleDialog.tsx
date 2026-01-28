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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight } from 'lucide-react';

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
  const { role: currentUserRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>(user.role);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isSuperAdmin = currentUserRole === 'super_admin';
  const isAdmin = currentUserRole === 'admin' || isSuperAdmin;

  // Get available roles based on current user's role
  // Both admins and super admins can assign any role except super_admin (only super admins can assign that)
  const getAvailableRoles = () => {
    const roles = [
      { value: 'viewer', label: 'Viewer', description: 'Can only view content' },
      { value: 'member', label: 'Member', description: 'Can create posts and chat' },
      { value: 'admin', label: 'Admin', description: 'Can manage content and users' },
    ];
    
    // Only super admins can assign super_admin role
    if (isSuperAdmin) {
      roles.push({ value: 'super_admin', label: 'Super Admin', description: 'Full access to everything' });
    }
    
    return roles;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'admin': return 'default';
      case 'member': return 'secondary';
      default: return 'outline';
    }
  };

  const handleUpdateRole = async () => {
    // Allow re-assigning same role (for demotion/promotion scenarios)

    // Prevent non-super-admins from modifying super_admin roles
    if (user.role === 'super_admin' && !isSuperAdmin) {
      toast({
        title: 'Permission denied',
        description: 'Only Super Admins can modify Super Admin roles',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('set-user-role', {
        body: {
          userId: user.user_id,
          role: selectedRole,
        },
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
        description: error.message || 'Failed to update role',
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
          {/* Current Role Display */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Current Role:</span>
            <Badge variant={getRoleBadgeVariant(user.role)}>
              {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
            {selectedRole !== user.role && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant={getRoleBadgeVariant(selectedRole)}>
                  {selectedRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">New Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableRoles().map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex flex-col">
                      <span>{role.label}</span>
                      <span className="text-xs text-muted-foreground">{role.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {!isSuperAdmin && (
              <p className="text-xs text-muted-foreground">
                Note: Only Super Admins can assign the Super Admin role. You can assign any other role.
              </p>
            )}
            <p className="text-xs text-primary mt-1">
              ✓ Users can be reassigned to any role, including their previous role.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateRole} 
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update Role'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
