import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserWithRole } from './UserCard';

interface DisableUserDialogProps {
  user: UserWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

export function DisableUserDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DisableUserDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
  };

  if (!user) return null;

  const isDisabling = !user.is_disabled;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDisabling ? 'Disable User Account' : 'Enable User Account'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDisabling
              ? `This will prevent ${user.full_name} from logging in. They won't be able to access the app until enabled again.`
              : `This will restore ${user.full_name}'s access to the app.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isDisabling && (
          <div className="space-y-2 py-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              placeholder="Enter reason for disabling..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className={isDisabling ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {isPending
              ? 'Processing...'
              : isDisabling
              ? 'Disable Account'
              : 'Enable Account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
