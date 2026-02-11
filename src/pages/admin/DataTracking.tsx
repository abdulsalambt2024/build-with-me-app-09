import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, FileText, Calendar, ClipboardList, Download, BarChart3, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(239,84%,67%)', 'hsl(160,84%,39%)', 'hsl(38,92%,50%)', 'hsl(0,84%,60%)'];

export default function DataTracking() {
  const { data, isLoading } = useQuery({
    queryKey: ['data-tracking'],
    queryFn: async () => {
      const [profilesRes, postsRes, eventsRes, tasksRes, attendanceRes, rolesRes, rsvpsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url, created_at'),
        supabase.from('posts').select('id, user_id, title, created_at'),
        supabase.from('events').select('id, title, event_date, attendees_count'),
        supabase.from('tasks').select('id, assigned_to, status, title, deadline, priority'),
        supabase.from('attendance').select('user_id, status, date'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('event_rsvps').select('user_id, event_id, status'),
      ]);

      const profiles = profilesRes.data || [];
      const posts = postsRes.data || [];
      const tasks = tasksRes.data || [];
      const attendance = attendanceRes.data || [];
      const roles = rolesRes.data || [];
      const rsvps = rsvpsRes.data || [];

      const roleMap = new Map(roles.map(r => [r.user_id, r.role]));

      // Build per-user stats
      const userStats = profiles.map(p => {
        const userPosts = posts.filter(post => post.user_id === p.user_id).length;
        const userTasks = tasks.filter(t => t.assigned_to === p.user_id);
        const completedTasks = userTasks.filter(t => t.status === 'completed').length;
        const userAttendance = attendance.filter(a => a.user_id === p.user_id);
        const presentCount = userAttendance.filter(a => a.status === 'present').length;
        const eventsParticipated = rsvps.filter(r => r.user_id === p.user_id && r.status === 'going').length;

        return {
          user_id: p.user_id,
          full_name: p.full_name || 'Unknown',
          role: roleMap.get(p.user_id) || 'viewer',
          posts: userPosts,
          tasks_total: userTasks.length,
          tasks_completed: completedTasks,
          attendance_total: userAttendance.length,
          attendance_present: presentCount,
          attendance_pct: userAttendance.length > 0 ? Math.round((presentCount / userAttendance.length) * 100) : 0,
          events_participated: eventsParticipated,
          joined: p.created_at,
        };
      });

      // Role distribution
      const roleCounts = [
        { name: 'Super Admin', value: roles.filter(r => r.role === 'super_admin').length },
        { name: 'Admin', value: roles.filter(r => r.role === 'admin').length },
        { name: 'Member', value: roles.filter(r => r.role === 'member').length },
        { name: 'Viewer', value: profiles.length - roles.length + roles.filter(r => r.role === 'viewer').length },
      ].filter(r => r.value > 0);

      // Task status distribution
      const taskStatusCounts = [
        { name: 'Pending', value: tasks.filter(t => t.status === 'pending').length },
        { name: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length },
        { name: 'Completed', value: tasks.filter(t => t.status === 'completed').length },
      ].filter(t => t.value > 0);

      // Top contributors by posts
      const topContributors = [...userStats].sort((a, b) => b.posts - a.posts).slice(0, 10);

      return {
        userStats,
        roleCounts,
        taskStatusCounts,
        topContributors,
        totals: {
          users: profiles.length,
          posts: posts.length,
          events: (eventsRes.data || []).length,
          tasks: tasks.length,
        }
      };
    },
  });

  const downloadCSV = () => {
    if (!data?.userStats) return;
    const headers = ['Name', 'Role', 'Posts', 'Tasks Total', 'Tasks Completed', 'Attendance %', 'Events Participated', 'Joined'];
    const rows = data.userStats.map(u => [
      u.full_name, u.role, u.posts, u.tasks_total, u.tasks_completed,
      u.attendance_pct + '%', u.events_participated, new Date(u.joined).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parivartan-data-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="container max-w-7xl mx-auto p-4"><div className="text-center py-12 text-muted-foreground">Loading data...</div></div>;
  }

  return (
    <div className="container max-w-7xl mx-auto p-4 pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Data Tracking</h1>
            <p className="text-sm text-muted-foreground">User activity, participation & performance</p>
          </div>
        </div>
        <Button onClick={downloadCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'Users', value: data?.totals.users || 0, color: 'bg-primary' },
          { icon: FileText, label: 'Posts', value: data?.totals.posts || 0, color: 'bg-secondary' },
          { icon: Calendar, label: 'Events', value: data?.totals.events || 0, color: 'bg-accent' },
          { icon: ClipboardList, label: 'Tasks', value: data?.totals.tasks || 0, color: 'bg-emerald-500' },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${s.color} shadow-sm`}>
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Posts</TableHead>
                    <TableHead className="text-center">Tasks</TableHead>
                    <TableHead className="text-center">Attendance</TableHead>
                    <TableHead className="text-center">Events</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.userStats.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium text-sm whitespace-nowrap">{u.full_name}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'super_admin' ? 'destructive' : u.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{u.posts}</TableCell>
                      <TableCell className="text-center">{u.tasks_completed}/{u.tasks_total}</TableCell>
                      <TableCell className="text-center">{u.attendance_pct}%</TableCell>
                      <TableCell className="text-center">{u.events_participated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Role Distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base">Role Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={data?.roleCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {data?.roleCounts.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Task Status */}
            <Card>
              <CardHeader><CardTitle className="text-base">Task Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data?.taskStatusCounts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(239,84%,67%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Contributors */}
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Top Contributors (by posts)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.topContributors} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="full_name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="posts" fill="hsl(160,84%,39%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
