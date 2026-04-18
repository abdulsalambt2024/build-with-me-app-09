import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Video, Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface AdVideo {
  id: string;
  video_url: string;
  title: string | null;
  is_active: boolean;
  display_order: number;
}

export function AdVideoPanel() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = role === 'super_admin';
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdVideo | null>(null);
  const [form, setForm] = useState({ video_url: '', title: '', is_active: true, display_order: 0 });

  const { data: ads } = useQuery({
    queryKey: ['ad-videos-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ad_video_settings')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      return (data || []) as AdVideo[];
    },
  });

  const { data: allAds } = useQuery({
    queryKey: ['ad-videos-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ad_video_settings')
        .select('*')
        .order('display_order', { ascending: true });
      return (data || []) as AdVideo[];
    },
    enabled: isSuperAdmin,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const path = `${user!.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('ad-videos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('ad-videos').getPublicUrl(path);
      return data.publicUrl;
    },
    onSuccess: (url) => setForm((f) => ({ ...f, video_url: url })),
    onError: (e: any) => toast.error(e.message || 'Upload failed'),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.video_url) throw new Error('Video URL is required');
      if (editing) {
        const { error } = await supabase
          .from('ad_video_settings')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ad_video_settings')
          .insert({ ...form, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ad-videos-active'] });
      qc.invalidateQueries({ queryKey: ['ad-videos-all'] });
      setOpen(false);
      setEditing(null);
      setForm({ video_url: '', title: '', is_active: true, display_order: 0 });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ad_video_settings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ad-videos-active'] });
      qc.invalidateQueries({ queryKey: ['ad-videos-all'] });
      toast.success('Deleted');
    },
  });

  const startEdit = (ad: AdVideo) => {
    setEditing(ad);
    setForm({ video_url: ad.video_url, title: ad.title || '', is_active: ad.is_active, display_order: ad.display_order });
    setOpen(true);
  };

  const isImageUrl = (u: string) => /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(u);

  // Public viewer: show first active ad (for any user)
  if (!isSuperAdmin) {
    if (!ads || ads.length === 0) return null;
    const u = ads[0].video_url;
    return (
      <Card className="border-0 shadow-soft overflow-hidden">
        <CardContent className="p-0">
          {isImageUrl(u) ? (
            <img src={u} alt={ads[0].title || 'Advertisement'} className="w-full aspect-video object-cover bg-black" />
          ) : (
            <video src={u} controls playsInline className="w-full aspect-video bg-black" />
          )}
          {ads[0].title && (
            <div className="p-2 text-xs font-medium text-muted-foreground">{ads[0].title}</div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Super Admin manager view
  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          Ad Videos
        </CardTitle>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm({ video_url: '', title: '', is_active: true, display_order: 0 }); } }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Ad Video</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Upload video or image</Label>
                <Input type="file" accept="video/*,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); }} disabled={upload.isPending} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Or paste media URL (video or image)</Label>
                <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Title (optional)</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Active</Label>
                <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Display Order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value || '0') })} />
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !form.video_url} className="w-full">
                {editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        {ads && ads.length > 0 && (
          <video src={ads[0].video_url} controls playsInline className="w-full aspect-video bg-black rounded-lg" />
        )}
        <div className="space-y-1">
          {(allAds || []).map((ad) => (
            <div key={ad.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{ad.title || ad.video_url}</p>
                <p className="text-[10px] text-muted-foreground">Order: {ad.display_order} · {ad.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(ad)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del.mutate(ad.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {(!allAds || allAds.length === 0) && <p className="text-xs text-muted-foreground text-center py-2">No ads yet</p>}
        </div>
      </CardContent>
    </Card>
  );
}
