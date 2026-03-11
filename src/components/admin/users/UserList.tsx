import { UserCard, UserWithRole } from './UserCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface UserListProps {
  users: UserWithRole[] | undefined;
  isLoading: boolean;
  isSuperAdmin: boolean;
  onView: (user: UserWithRole) => void;
  onEdit: (user: UserWithRole) => void;
  onDelete: (user: UserWithRole) => void;
  onToggleDisable: (user: UserWithRole) => void;
  onResetPassword?: (user: UserWithRole) => void;
  onEditDetails?: (user: UserWithRole) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount: number;
}

function UserCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export function UserList({
  users, isLoading, isSuperAdmin, onView, onEdit, onDelete, onToggleDisable,
  onResetPassword, onEditDetails, page, totalPages, onPageChange, totalCount,
}: UserListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[...Array(5)].map((_, i) => <UserCardSkeleton key={i} />)}
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No users found</p></CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {users.map((user) => (
          <UserCard key={user.id} user={user} isSuperAdmin={isSuperAdmin}
            onView={onView} onEdit={onEdit} onDelete={onDelete}
            onToggleDisable={onToggleDisable} onResetPassword={onResetPassword}
            onEditDetails={onEditDetails} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
