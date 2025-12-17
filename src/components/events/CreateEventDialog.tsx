import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Plus, Loader2, Upload, X, Crop } from 'lucide-react';
import { useCreateEvent } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [cropScale, setCropScale] = useState([1]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
    end_date: '',
    registration_url: '',
    banner_url: '',
    max_attendees: ''
  });
  
  const createEvent = useCreateEvent();
  const { toast } = useToast();

  const compressImage = async (file: File, maxSizeKB: number = 500): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Target dimensions (16:9 aspect ratio for event posters)
        const targetWidth = 1200;
        const targetHeight = 675;
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Calculate crop area based on scale
        const scale = cropScale[0];
        const srcWidth = img.width / scale;
        const srcHeight = img.height / scale;
        const srcX = (img.width - srcWidth) / 2;
        const srcY = (img.height - srcHeight) / 2;
        
        ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, targetWidth, targetHeight);
        
        // Compress
        let quality = 0.9;
        const compress = () => {
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size / 1024 > maxSizeKB && quality > 0.1) {
                quality -= 0.1;
                compress();
              } else {
                resolve(blob || new Blob());
              }
            },
            'image/jpeg',
            quality
          );
        };
        compress();
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowCrop(true);
    setCropScale([1]);
  };

  const handleCropConfirm = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    try {
      const compressed = await compressImage(selectedFile);
      const fileName = `event-${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('event-banners')
        .upload(fileName, compressed, { contentType: 'image/jpeg' });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('event-banners')
        .getPublicUrl(fileName);
      
      setFormData(prev => ({ ...prev, banner_url: publicUrl }));
      setShowCrop(false);
      toast({ title: 'Success', description: 'Poster uploaded successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.event_date) return;
    
    await createEvent.mutateAsync({
      title: formData.title,
      description: formData.description,
      location: formData.location || null,
      event_date: formData.event_date,
      end_date: formData.end_date || null,
      registration_url: formData.registration_url || null,
      banner_url: formData.banner_url || null,
      max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null
    });
    
    setFormData({
      title: '',
      description: '',
      location: '',
      event_date: '',
      end_date: '',
      registration_url: '',
      banner_url: '',
      max_attendees: ''
    });
    setPreviewUrl(null);
    setSelectedFile(null);
    setOpen(false);
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, banner_url: '' }));
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {showCrop && previewUrl ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Crop Event Poster</DialogTitle>
              <DialogDescription>
                Adjust the zoom to crop your image (16:9 ratio)
              </DialogDescription>
            </DialogHeader>
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <img 
                src={previewUrl} 
                alt="Preview"
                className="w-full h-full object-cover"
                style={{ transform: `scale(${cropScale[0]})` }}
              />
            </div>
            <div className="space-y-2">
              <Label>Zoom</Label>
              <Slider
                value={cropScale}
                onValueChange={setCropScale}
                min={1}
                max={3}
                step={0.1}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCrop(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCropConfirm} disabled={uploading} className="flex-1">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crop className="h-4 w-4 mr-2" />}
                Confirm
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>
                Plan and organize a community event
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Poster Upload */}
              <div className="space-y-2">
                <Label>Event Poster</Label>
                {formData.banner_url ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <img src={formData.banner_url} alt="Poster" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload poster</p>
                    <p className="text-xs text-muted-foreground mt-1">Recommended: 1200x675 (16:9)</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  placeholder="Annual Community Meetup"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Event details and agenda"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[100px]"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Venue</Label>
                <Input
                  id="location"
                  placeholder="Community Center, Main Hall"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_date">Start Date & Time *</Label>
                  <Input
                    id="event_date"
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={e => setFormData({ ...formData, event_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date & Time</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_attendees">Maximum Attendees</Label>
                <Input
                  id="max_attendees"
                  type="number"
                  placeholder="100"
                  value={formData.max_attendees}
                  onChange={e => setFormData({ ...formData, max_attendees: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="registration_url">Registration URL</Label>
                <Input
                  id="registration_url"
                  type="url"
                  placeholder="https://forms.google.com/..."
                  value={formData.registration_url}
                  onChange={e => setFormData({ ...formData, registration_url: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEvent.isPending}>
                {createEvent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Event
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
