import { useAuth } from '@/contexts/AuthContext';
import { Slideshow } from '@/components/home/Slideshow';
import { CombinedFeed } from '@/components/feed/CombinedFeed';

export default function Home() {
  const { role } = useAuth();

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold">Welcome to PARIVARTAN</h1>
        <p className="text-lg font-medium text-primary">ENLIGHTEN A CHILD, DISCOVER A PERSONALITY</p>
      </div>

      <Slideshow />

      <div>
        <h2 className="text-xl font-semibold mb-4">Community Feed</h2>
        <CombinedFeed />
      </div>
    </div>
  );
}
