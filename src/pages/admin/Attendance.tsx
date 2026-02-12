import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, UserCheck, UserX, Clock, CalendarDays, Users, Check, X, Download } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_by: string;
  notes: string | null;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  roll_number: string | null;
  course: string | null;
  branch: string | null;
}

export default function Attendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCalendar, setShowCalendar] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: members } = useQuery({
    queryKey: ['members-for-attendance'],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['member', 'admin', 'super_admin']);
      if (!roles?.length) return [];
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, roll_number, course, branch')
        .in('user_id', userIds);
      if (error) throw error;
      return profiles as UserProfile[];
    },
  });

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['attendance', dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', dateStr);
      if (error) throw error;
      return data as AttendanceRecord[];
    },
  });

  const markAttendance = useMutation({
    mutationFn: async ({ userId, status, notes }: { userId: string; status: string; notes?: string }) => {
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('user_id', userId)
        .eq('date', dateStr)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('attendance')
          .update({ status, notes, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('attendance')
          .insert({ user_id: userId, date: dateStr, status, notes, marked_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', dateStr] });
      toast.success('Attendance marked');
    },
    onError: () => toast.error('Failed to mark attendance'),
  });

  const markAllPresent = async () => {
    if (!members) return;
    for (const member of members) {
      const existing = attendance?.find(a => a.user_id === member.user_id);
      if (!existing) {
        await markAttendance.mutateAsync({ userId: member.user_id, status: 'present' });
      }
    }
    toast.success('All members marked present');
  };

  const downloadAttendance = () => {
    if (!members || !attendance) return;
    const rows = members.map(m => {
      const record = attendance.find(a => a.user_id === m.user_id);
      return `${m.full_name || 'Unknown'},${m.roll_number || '-'},${record?.status || 'Not Marked'}`;
    });
    const csv = `Name,Roll Number,Status\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Attendance downloaded');
  };

  const getAttendanceStatus = (userId: string) => attendance?.find(a => a.user_id === userId)?.status || null;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'present': return <Badge className="bg-emerald-500 text-xs"><Check className="h-3 w-3 mr-1" />P</Badge>;
      case 'absent': return <Badge variant="destructive" className="text-xs"><X className="h-3 w-3 mr-1" />A</Badge>;
      case 'late': return <Badge className="bg-amber-500 text-xs"><Clock className="h-3 w-3 mr-1" />L</Badge>;
      case 'excused': return <Badge variant="secondary" className="text-xs">E</Badge>;
      default: return <Badge variant="outline" className="text-xs">—</Badge>;
    }
  };

  const filteredMembers = members?.filter(member => {
    const matchesSearch =
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.roll_number?.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'all') return matchesSearch;
    const status = getAttendanceStatus(member.user_id);
    if (statusFilter === 'not_marked') return matchesSearch && !status;
    return matchesSearch && status === statusFilter;
  });

  const stats = {
    total: members?.length || 0,
    present: attendance?.filter(a => a.status === 'present').length || 0,
    absent: attendance?.filter(a => a.status === 'absent').length || 0,
    late: attendance?.filter(a => a.status === 'late').length || 0,
  };

  return (
    <div className="container max-w-7xl mx-auto p-3 sm:p-4 pb-24 space-y-4">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold">Attendance</h1>
        <p className="text-sm text-muted-foreground">Mark and track member attendance</p>
      </div>

      {/* Stats - 4 columns compact */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Users, label: 'Total', value: stats.total, color: 'text-muted-foreground' },
          { icon: UserCheck, label: 'Present', value: stats.present, color: 'text-emerald-500' },
          { icon: UserX, label: 'Absent', value: stats.absent, color: 'text-destructive' },
          { icon: Clock, label: 'Late', value: stats.late, color: 'text-amber-500' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-2 sm:p-4 text-center">
              <s.icon className={`h-4 w-4 sm:h-6 sm:w-6 mx-auto ${s.color}`} />
              <div className={`text-lg sm:text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Date picker button + Calendar toggle */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="outline" size="sm" onClick={() => setShowCalendar(!showCalendar)}>
          <CalendarDays className="h-4 w-4 mr-1.5" />
          {format(selectedDate, 'MMM d, yyyy')}
        </Button>
        <Button size="sm" onClick={markAllPresent}>
          <Check className="h-4 w-4 mr-1.5" />
          All Present
        </Button>
        <Button size="sm" variant="outline" onClick={downloadAttendance}>
          <Download className="h-4 w-4 mr-1.5" />
          CSV
        </Button>
      </div>

      {showCalendar && (
        <Card>
          <CardContent className="p-2 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => { if (date) { setSelectedDate(date); setShowCalendar(false); }}}
              className="rounded-md"
            />
          </CardContent>
        </Card>
      )}

      {/* Search and filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="not_marked">Not Marked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members list - card based for mobile */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredMembers?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No members found</div>
        ) : (
          filteredMembers?.map((member) => {
            const status = getAttendanceStatus(member.user_id);
            return (
              <Card key={member.user_id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium">{member.full_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{member.full_name || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{member.roll_number || '-'}</div>
                  </div>
                  <div className="shrink-0">{getStatusBadge(status)}</div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant={status === 'present' ? 'default' : 'outline'} className={`h-8 w-8 ${status === 'present' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                      onClick={() => markAttendance.mutate({ userId: member.user_id, status: 'present' })}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant={status === 'absent' ? 'destructive' : 'outline'} className="h-8 w-8"
                      onClick={() => markAttendance.mutate({ userId: member.user_id, status: 'absent' })}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant={status === 'late' ? 'default' : 'outline'} className={`h-8 w-8 ${status === 'late' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                      onClick={() => markAttendance.mutate({ userId: member.user_id, status: 'late' })}>
                      <Clock className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
