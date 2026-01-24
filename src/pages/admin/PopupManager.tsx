import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit, Calendar, Gift, PartyPopper, Bell, Eye, Loader2, X, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Popup {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  popup_type: string;
  show_date: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export default function PopupManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [previewPopup, setPreviewPopup] = useState<Popup | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    image_url: '',
    popup_type: 'announcement',
    show_date: '',
    is_active: true
  });

  const { data: popups, isLoading } = useQuery({
    queryKey: ['admin-popups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('popups')
        .select('*')
        .order('show_date', { ascending: false });
      if (error) throw error;
      return data as Popup[];
    }
  });

  const createPopup = useMutation({
    mutationFn: async (popup: typeof formData) => {
      const { error } = await supabase
        .from('popups')
        .insert({
          ...popup,
          created_by: user?.id
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-popups'] });
      toast.success('Popup created successfully');
      resetForm();
    },
    onError: () => toast.error('Failed to create popup')
  });

  const updatePopup = useMutation({
    mutationFn: async ({ id, ...popup }: { id: string } & typeof formData) => {
      const { error } = await supabase
        .from('popups')
        .update(popup)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-popups'] });
      toast.success('Popup updated successfully');
      resetForm();
    },
    onError: () => toast.error('Failed to update popup')
  });

  const deletePopup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('popups')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-popups'] });
      toast.success('Popup deleted');
    },
    onError: () => toast.error('Failed to delete popup')
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('popups')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-popups'] });
      toast.success('Popup status updated');
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      image_url: '',
      popup_type: 'announcement',
      show_date: '',
      is_active: true
    });
    setEditingPopup(null);
    setDialogOpen(false);
  };

  const handleEdit = (popup: Popup) => {
    setEditingPopup(popup);
    setFormData({
      title: popup.title,
      message: popup.message,
      image_url: popup.image_url || '',
      popup_type: popup.popup_type,
      show_date: popup.show_date.split('T')[0] + 'T' + popup.show_date.split('T')[1]?.substring(0, 5) || '',
      is_active: popup.is_active
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message || !formData.show_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (editingPopup) {
      updatePopup.mutate({ id: editingPopup.id, ...formData });
    } else {
      createPopup.mutate(formData);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'birthday': return <Gift className="h-4 w-4" />;
      case 'festival': return <PartyPopper className="h-4 w-4" />;
      case 'announcement': return <Bell className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'birthday': return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
      case 'festival': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'announcement': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getGradient = (type: string) => {
    switch (type) {
      case 'birthday': return 'from-pink-500/20 via-purple-500/10 to-pink-500/20';
      case 'festival': return 'from-yellow-500/20 via-orange-500/10 to-yellow-500/20';
      case 'announcement': return 'from-primary/20 via-primary/10 to-primary/20';
      default: return 'from-primary/20 via-primary/10 to-primary/20';
    }
  };

  const getPreviewIcon = (type: string) => {
    switch (type) {
      case 'birthday': return <Gift className="h-8 w-8 text-pink-500" />;
      case 'festival': return <PartyPopper className="h-8 w-8 text-yellow-500" />;
      case 'announcement': return <Bell className="h-8 w-8 text-primary" />;
      default: return <Sparkles className="h-8 w-8 text-primary" />;
    }
  };

  const handlePreview = (popup: Popup) => {
    setPreviewPopup(popup);
    setShowPreview(true);
  };

  const handlePreviewFromForm = () => {
    if (!formData.title || !formData.message) {
      toast.error('Please fill in title and message to preview');
      return;
    }
    const previewData: Popup = {
      id: 'preview',
      title: formData.title,
      message: formData.message,
      image_url: formData.image_url || null,
      popup_type: formData.popup_type,
      show_date: formData.show_date || new Date().toISOString(),
      is_active: formData.is_active,
      created_by: user?.id || '',
      created_at: new Date().toISOString()
    };
    setPreviewPopup(previewData);
    setShowPreview(true);
  };

  return (
    <div className="container max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Popup Messages</h1>
          <p className="text-sm text-muted-foreground">Create and manage popup greetings for birthdays, festivals, and announcements</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Popup
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPopup ? 'Edit Popup' : 'Create New Popup'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Happy Birthday!"
                />
              </div>
              <div>
                <Label>Message *</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Write your greeting message..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={formData.popup_type} onValueChange={(v) => setFormData({ ...formData, popup_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birthday">🎂 Birthday</SelectItem>
                    <SelectItem value="festival">🎉 Festival</SelectItem>
                    <SelectItem value="announcement">📢 Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Show Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.show_date}
                  onChange={(e) => setFormData({ ...formData, show_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Image URL (optional)</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={handlePreviewFromForm}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button type="submit" className="flex-1" disabled={createPopup.isPending || updatePopup.isPending}>
                  {(createPopup.isPending || updatePopup.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingPopup ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Bell className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-lg font-bold">{popups?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <Gift className="h-4 w-4 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-lg font-bold">{popups?.filter(p => p.is_active).length || 0}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900">
              <Gift className="h-4 w-4 text-pink-600 dark:text-pink-300" />
            </div>
            <div>
              <p className="text-lg font-bold">{popups?.filter(p => p.popup_type === 'birthday').length || 0}</p>
              <p className="text-xs text-muted-foreground">Birthdays</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
              <PartyPopper className="h-4 w-4 text-yellow-600 dark:text-yellow-300" />
            </div>
            <div>
              <p className="text-lg font-bold">{popups?.filter(p => p.popup_type === 'festival').length || 0}</p>
              <p className="text-xs text-muted-foreground">Festivals</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popup List */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : popups && popups.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {popups.map((popup) => (
              <Card key={popup.id} className={`transition-opacity ${!popup.is_active ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getTypeColor(popup.popup_type)}>
                        {getTypeIcon(popup.popup_type)}
                        <span className="ml-1 capitalize">{popup.popup_type}</span>
                      </Badge>
                      {!popup.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={popup.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: popup.id, is_active: v })}
                      />
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{popup.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {popup.image_url && (
                    <img src={popup.image_url} alt={popup.title} className="w-full h-32 object-cover rounded-lg" />
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2">{popup.message}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(popup.show_date), 'PPp')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePreview(popup)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(popup)}>
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('Delete this popup?')) deletePopup.mutate(popup.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <PartyPopper className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No popup messages yet</p>
              <p className="text-sm">Create your first popup greeting!</p>
            </CardContent>
          </Card>
        )}
      </ScrollArea>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0">
          {previewPopup && (
            <div className={`relative bg-gradient-to-br ${getGradient(previewPopup.popup_type)}`}>
              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {previewPopup.image_url && (
                <div className="relative h-48 w-full">
                  <img
                    src={previewPopup.image_url}
                    alt={previewPopup.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                </div>
              )}

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-background/80 shadow-sm">
                    {getPreviewIcon(previewPopup.popup_type)}
                  </div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    {previewPopup.popup_type}
                  </span>
                  <Badge variant="outline" className="ml-auto">Preview</Badge>
                </div>

                <h2 className="text-2xl font-bold leading-tight">
                  {previewPopup.title}
                </h2>

                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {previewPopup.message}
                </p>

                <p className="text-xs text-muted-foreground">
                  {previewPopup.show_date ? format(new Date(previewPopup.show_date), 'EEEE, MMMM d, yyyy') : 'No date set'}
                </p>

                <Button onClick={() => setShowPreview(false)} className="w-full mt-4">
                  Got it! ✨
                </Button>
              </div>

              {previewPopup.popup_type === 'birthday' && (
                <>
                  <div className="absolute top-4 left-4 text-4xl animate-bounce">🎈</div>
                  <div className="absolute top-8 right-12 text-3xl animate-pulse">🎂</div>
                </>
              )}
              {previewPopup.popup_type === 'festival' && (
                <>
                  <div className="absolute top-4 left-4 text-4xl animate-bounce">🎊</div>
                  <div className="absolute top-8 right-12 text-3xl animate-pulse">✨</div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}