import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { HamburgerMenu } from './HamburgerMenu';
import { EnhancedChatbot } from '@/components/chatbot/EnhancedChatbot';
import { NotificationPermissionPrompt } from '@/components/notifications/NotificationPermissionPrompt';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const showChatbot = location.pathname === '/';

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setMenuOpen(true)} />
      <HamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <NotificationPermissionPrompt />

      <main className="pb-20 pt-[env(safe-area-inset-top)]">
        {children}
      </main>

      <BottomNavigation />
      {showChatbot && <EnhancedChatbot />}
    </div>
  );
}
