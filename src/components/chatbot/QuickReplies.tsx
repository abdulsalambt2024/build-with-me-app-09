import { useMemo } from 'react';

interface QuickReply {
  label: string;
  message: string;
}

interface QuickRepliesProps {
  role: string | null;
  onSelect: (message: string) => void;
}

// Base quick replies for all users
const VIEWER_REPLIES: QuickReply[] = [
  { label: '📅 View Events', message: 'How can I view and register for events?' },
  { label: '📢 Announcements', message: 'How do I check announcements?' },
  { label: '💰 Donations', message: 'How can I donate to campaigns?' },
  { label: '🏆 Achievements', message: 'How do achievements work?' },
  { label: '👤 My Profile', message: 'How do I update my profile?' },
  { label: '⚙️ Settings', message: 'How do I change my settings?' },
];

// Additional quick replies for members
const MEMBER_REPLIES: QuickReply[] = [
  { label: '📝 Create Post', message: 'How do I create a post?' },
  { label: '💬 Start Chat', message: 'How do I start a group chat?' },
  { label: '🎨 AI Studio', message: 'What can I do in AI Studio?' },
  { label: '📷 Upload Media', message: 'How do I upload images and videos?' },
];

// Additional quick replies for admins
const ADMIN_REPLIES: QuickReply[] = [
  { label: '👥 Manage Users', message: 'How do I manage user roles?' },
  { label: '📊 Analytics', message: 'How do I view app analytics?' },
  { label: '🎪 Create Event', message: 'How do I create a new event?' },
  { label: '📣 Add Announcement', message: 'How do I create an announcement?' },
  { label: '🎯 Assign Tasks', message: 'How do I assign tasks to users?' },
];

// Super admin exclusive replies
const SUPER_ADMIN_REPLIES: QuickReply[] = [
  { label: '🔐 Security', message: 'How do I manage 2FA and security settings?' },
  { label: '🏅 Badges', message: 'How do I assign verification badges?' },
  { label: '⚡ System Config', message: 'What system configurations can I change?' },
];

export function QuickReplies({ role, onSelect }: QuickRepliesProps) {
  const quickReplies = useMemo(() => {
    let replies = [...VIEWER_REPLIES];

    if (role === 'member' || role === 'admin' || role === 'super_admin') {
      replies = [...MEMBER_REPLIES, ...replies];
    }

    if (role === 'admin' || role === 'super_admin') {
      replies = [...ADMIN_REPLIES, ...replies];
    }

    if (role === 'super_admin') {
      replies = [...SUPER_ADMIN_REPLIES, ...replies];
    }

    // Return top 8 most relevant for the role
    return replies.slice(0, 8);
  }, [role]);

  return (
    <div className="flex flex-wrap gap-2 justify-center max-w-md mx-auto">
      {quickReplies.map((qr) => (
        <button
          key={qr.label}
          onClick={() => onSelect(qr.message)}
          className="text-xs px-3 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
        >
          {qr.label}
        </button>
      ))}
    </div>
  );
}
