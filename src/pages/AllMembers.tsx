import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Users, BookOpen, Calendar, MoreVertical, Trash2, KeyRound, UserCog, UserPen, Loader2 } from 'lucide-react';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AddUserDialog } from '@/components/admin/AddUserDialog';
import { EditRoleDialog } from '@/components/admin/EditRoleDialog';

interface MemberProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  branch: string | null;
  course: string | null;
  semester: string | null;
  year: string | null;
  roll_number: string | null;
  father_name: string | null;
  date_of_birth: string | null;
  created_at: string;
  role?: string;
}

export default function AllMembers() {
  const { role: currentRole } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<MemberProfile | null>(null);
  const [editingUser, setEditingUser] = useState<MemberProfile | null>(null);
  const [editDetailsUser, setEditDetailsUser] = useState<MemberProfile | null>(null);
  const [resetUser, setResetUser] = useState<MemberProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [editForm, setEditForm] = useState({
    full_name: '', bio: '', course: '', branch: '', roll_number: '',
    year: '', semester: '', father_name: '', date_of_birth: '',
  });

  const isSuperAdmin = currentRole === 'super_admin';

  const { data: members, isLoading } = useQuery({
    queryKey: ['all-members'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, bio, branch, course, semester, year, roll_number, father_name, date_of_birth, created_at')
        .eq('is_disabled', false)
        .order('full_name');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role');
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]));
      return profiles?.map(p => ({ ...p, role: roleMap.get(p.user_id) || 'viewer' })) as MemberProfile[];
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke('delete-user', { body: { userId } });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      toast.success('User deleted permanently');
      setDeletingUser(null);
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete user'),
  });

  const resetPwMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { error } = await supabase.functions.invoke('reset-user-password', { body: { userId, newPassword } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password reset successfully');
      setResetUser(null);
      setNewPassword('');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to reset password'),
  });

  const editDetailsMutation = useMutation({
    mutationFn: async ({ userId, details }: { userId: string; details: typeof editForm }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: details.full_name || null,
          bio: details.bio || null,
          course: details.course || null,
          branch: details.branch || null,
          roll_number: details.roll_number || null,
          year: details.year || null,
          semester: details.semester || null,
          father_name: details.father_name || null,
          date_of_birth: details.date_of_birth || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-members'] });
      toast.success('Profile updated successfully');
      setEditDetailsUser(null);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update profile'),
  });

  const openEditDetails = (member: MemberProfile) => {
    setEditForm({
      full_name: member.full_name || '', bio: member.bio || '', course: member.course || '',
      branch: member.branch || '', roll_number: member.roll_number || '', year: member.year || '',
      semester: member.semester || '', father_name: member.father_name || '', date_of_birth: member.date_of_birth || '',
    });
    setEditDetailsUser(member);
  };

  const filtered = members?.filter(m => {
    const matchesSearch = !search ||
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.branch?.toLowerCase().includes(search.toLowerCase()) ||
      m.roll_number?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role?: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-destructive/10 text-destructive',
      admin: 'bg-primary/10 text-primary',
      member: 'bg-green-500/10 text-green-700 dark:text-green-400',
      viewer: 'bg-muted text-muted-foreground',
    };
    const labels: Record<string, string> = { super_admin: 'Super Admin', admin: 'Admin', member: 'Member', viewer: 'Viewer' };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[role || 'viewer']}`}>{labels[role || 'viewer']}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto p-4 pb-24 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary shadow-lg">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">All Members</h1>
              <p className="text-xs text-muted-foreground">{filtered?.length || 0} members</p>
            </div>
          </div>
          {isSuperAdmin && <AddUserDialog />}
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-3 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, branch, roll..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 border-0 bg-muted/50" />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[120px] border-0 bg-muted/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="border-0"><CardContent className="p-3"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div></div></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered?.map(member => (
              <Card key={member.user_id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 cursor-pointer" onClick={() => setSelectedMember(member)}>
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">{member.full_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedMember(member)}>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm truncate">{member.full_name || 'Unknown'}</p>
                        <VerifiedBadge userId={member.user_id} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getRoleBadge(member.role)}
                        {member.branch && <span className="text-xs text-muted-foreground">{member.branch}</span>}
                      </div>
                    </div>
                    {isSuperAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDetails(member)}>
                            <UserPen className="h-4 w-4 mr-2" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingUser(member)}>
                            <UserCog className="h-4 w-4 mr-2" /> Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetUser(member)}>
                            <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                          </DropdownMenuItem>
                          {member.role !== 'super_admin' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeletingUser(member)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered?.length === 0 && (
              <Card className="border-0"><CardContent className="py-12 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" /><p className="text-muted-foreground">No members found</p></CardContent></Card>
            )}
          </div>
        )}

        {/* Profile Dialog */}
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Member Profile</DialogTitle></DialogHeader>
            {selectedMember && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedMember.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">{selectedMember.full_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <h3 className="font-bold text-lg">{selectedMember.full_name}</h3>
                      <VerifiedBadge userId={selectedMember.user_id} />
                    </div>
                    {getRoleBadge(selectedMember.role)}
                  </div>
                </div>
                {selectedMember.bio && <p className="text-sm text-muted-foreground text-center">{selectedMember.bio}</p>}
                <div className="space-y-2 text-sm">
                  {selectedMember.course && <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" /><span>{selectedMember.course}</span></div>}
                  {selectedMember.branch && <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-muted-foreground" /><span>{selectedMember.branch} {selectedMember.semester && `• Sem ${selectedMember.semester}`}</span></div>}
                  {selectedMember.roll_number && <div className="flex items-center gap-2"><span className="text-muted-foreground font-medium">Roll:</span><span>{selectedMember.roll_number}</span></div>}
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Joined {new Date(selectedMember.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span></div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        {editingUser && (
          <EditRoleDialog
            user={{ id: '', user_id: editingUser.user_id, full_name: editingUser.full_name, role: (editingUser.role || 'viewer') as any }}
            open={!!editingUser}
            onOpenChange={(open) => { if (!open) setEditingUser(null); }}
          />
        )}

        {/* Edit Details Dialog */}
        <Dialog open={!!editDetailsUser} onOpenChange={(open) => { if (!open) setEditDetailsUser(null); }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><UserPen className="h-5 w-5" /> Edit Profile Details</DialogTitle>
              <DialogDescription>Edit profile for <strong>{editDetailsUser?.full_name}</strong></DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {[
                { key: 'full_name', label: 'Full Name' },
                { key: 'bio', label: 'Bio' },
                { key: 'father_name', label: "Father's Name" },
                { key: 'course', label: 'Course' },
                { key: 'branch', label: 'Branch' },
                { key: 'roll_number', label: 'Roll Number' },
                { key: 'year', label: 'Year' },
                { key: 'semester', label: 'Semester' },
                { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
              ].map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-sm">{field.label}</Label>
                  <Input
                    type={field.type || 'text'}
                    value={editForm[field.key as keyof typeof editForm]}
                    onChange={(e) => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditDetailsUser(null)}>Cancel</Button>
                <Button onClick={() => editDetailsUser && editDetailsMutation.mutate({ userId: editDetailsUser.user_id, details: editForm })}
                  disabled={editDetailsMutation.isPending}>
                  {editDetailsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User Permanently</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{deletingUser?.full_name}</strong> and all their data. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deletingUser && deleteMutation.mutate(deletingUser.user_id)}>
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reset Password Dialog */}
        <Dialog open={!!resetUser} onOpenChange={(open) => { if (!open) { setResetUser(null); setNewPassword(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Reset Password</DialogTitle>
              <DialogDescription>Set a new password for <strong>{resetUser?.full_name}</strong></DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" placeholder="Min 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setResetUser(null); setNewPassword(''); }}>Cancel</Button>
                <Button
                  onClick={() => resetUser && resetPwMutation.mutate({ userId: resetUser.user_id, newPassword })}
                  disabled={newPassword.length < 6 || resetPwMutation.isPending}
                >
                  {resetPwMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Reset Password
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
