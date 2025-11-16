import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Loader2 } from 'lucide-react';

interface MediaUploadProps {
  onMediaUploaded: (urls: string[]) => void;
  existingMedia?: string[];
}

export function MediaUpload({ onMediaUploaded, existingMedia = [] }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>(existingMedia);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-media')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      const newMediaUrls = [...mediaUrls, ...uploadedUrls];
      setMediaUrls(newMediaUrls);
      onMediaUploaded(newMediaUrls);
      toast.success('Media uploaded successfully');
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    const newMediaUrls = mediaUrls.filter((_, i) => i !== index);
    setMediaUrls(newMediaUrls);
    onMediaUploaded(newMediaUrls);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileUpload}
          disabled={uploading}
        />
        {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>

      {mediaUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mediaUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeMedia(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
