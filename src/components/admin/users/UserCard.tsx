import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Eye, UserCog, Ban, CheckCircle } from 'lucide-react';

export interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: 'viewer' | 'member' | 'admin' | 'super_admin';
  bio?: string | null;
  course?: string | null;
  branch?: string | null;
  roll_number?: string | null;
  year?: string | null;
  semester?: string | null;
  father_name?: string | null;
  date_of_birth?: string | null;
  is_disabled?: boolean;
}

interface UserCardProps {
  user: UserWithRole;
  isSuperAdmin: boolean;
  onView: (user: UserWithRole) => void;
  onEdit: (user: UserWithRole) => void;
  onDelete: (user: UserWithRole) => void;
  onToggleDisable: (user: UserWithRole) => void;
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'super_admin': return 'destructive';
    case 'admin': return 'default';
    case 'member': return 'secondary';
    default: return 'outline';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'member': return 'Member';
    default: return 'Viewer';
  }
};

export const UserCard = memo(({ 
  user, 
  isSuperAdmin, 
  onView, 
  onEdit, 
  onDelete,
  onToggleDisable 
}: UserCardProps) => {
  return (
    <Card className={user.is_disabled ? 'opacity-60 border-destructive/30' : ''}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || ''} />
            <AvatarFallback>
              {user.full_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{user.full_name || 'Unknown User'}</h3>
              {user.is_disabled && (
                <Badge variant="destructive" className="text-xs">Disabled</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {user.course && user.branch 
                ? `${user.course} - ${user.branch}` 
                : 'Joined ' + new Date(user.created_at).toLocaleDateString()}
            </p>
            {user.roll_number && (
              <p className="text-xs text-muted-foreground">Roll: {user.roll_number}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant={getRoleBadgeVariant(user.role)}>
            {getRoleLabel(user.role)}
          </Badge>
          
          {isSuperAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onView(user)}
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(user)}
            className="flex-1 sm:flex-none"
          >
            <UserCog className="h-4 w-4 mr-1" />
            Edit Role
          </Button>

          {isSuperAdmin && user.role !== 'super_admin' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleDisable(user)}
                title={user.is_disabled ? 'Enable User' : 'Disable User'}
                className={user.is_disabled ? 'text-green-600' : 'text-amber-600'}
              >
                {user.is_disabled ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(user)}
                title="Remove User Permanently"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

UserCard.displayName = 'UserCard';
