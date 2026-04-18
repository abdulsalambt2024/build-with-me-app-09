import { AdVideoPanel } from '@/components/admin/AdVideoPanel';

export default function AdVideos() {
  return (
    <div className="container max-w-3xl mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">Advertisement Videos</h1>
        <p className="text-sm text-muted-foreground">
          Upload and manage advertisement videos shown in the floating panel on the Home page. Super Admin only.
        </p>
      </div>
      <AdVideoPanel />
    </div>
  );
}
