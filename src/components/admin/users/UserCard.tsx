import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trash2, Eye, UserCog, Ban, CheckCircle, MoreVertical, KeyRound } from 'lucide-react';

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
  onResetPassword?: (user: UserWithRole) => void;
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
  user, isSuperAdmin, onView, onEdit, onDelete, onToggleDisable, onResetPassword
}: UserCardProps) => {
  return (
    <Card className={user.is_disabled ? 'opacity-60 border-destructive/30' : ''}>
      <CardContent className="flex items-center justify-between p-4 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={user.avatar_url || ''} />
            <AvatarFallback>{user.full_name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{user.full_name || 'Unknown'}</h3>
              {user.is_disabled && <Badge variant="destructive" className="text-[10px] px-1.5">Disabled</Badge>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getRoleBadgeVariant(user.role)} className="text-[10px]">
                {getRoleLabel(user.role)}
              </Badge>
              {user.branch && <span className="text-xs text-muted-foreground">{user.branch}</span>}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(user)}>
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <UserCog className="h-4 w-4 mr-2" /> Edit Role
            </DropdownMenuItem>
            {isSuperAdmin && onResetPassword && (
              <DropdownMenuItem onClick={() => onResetPassword(user)}>
                <KeyRound className="h-4 w-4 mr-2" /> Reset Password
              </DropdownMenuItem>
            )}
            {isSuperAdmin && user.role !== 'super_admin' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onToggleDisable(user)}>
                  {user.is_disabled ? (
                    <><CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Enable Account</>
                  ) : (
                    <><Ban className="h-4 w-4 mr-2 text-amber-600" /> Disable Account</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(user)} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Permanently
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
});

UserCard.displayName = 'UserCard';
