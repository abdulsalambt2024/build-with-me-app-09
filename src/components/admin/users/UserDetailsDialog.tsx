import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserWithRole } from './UserCard';

interface UserDetailsDialogProps {
  user: UserWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function UserDetailsDialog({ user, open, onOpenChange }: UserDetailsDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url || ''} />
              <AvatarFallback>{user.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{user.full_name}</h3>
                {user.is_disabled && (
                  <Badge variant="destructive" className="text-xs">Disabled</Badge>
                )}
              </div>
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {getRoleLabel(user.role)}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Course</p>
              <p className="font-medium">{user.course || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Branch</p>
              <p className="font-medium">{user.branch || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Roll Number</p>
              <p className="font-medium">{user.roll_number || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Year</p>
              <p className="font-medium">{user.year || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Semester</p>
              <p className="font-medium">{user.semester || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date of Birth</p>
              <p className="font-medium">{user.date_of_birth || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Father's Name</p>
              <p className="font-medium">{user.father_name || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Bio</p>
              <p className="font-medium">{user.bio || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Joined</p>
              <p className="font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
