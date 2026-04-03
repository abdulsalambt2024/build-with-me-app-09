import { Card, CardContent } from '@/components/ui/card';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto p-4 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary shadow-lg">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-heading font-bold">Privacy Policy</h1>
          </div>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none space-y-5">
            <p className="text-xs text-muted-foreground">Last Updated: March 15, 2026</p>

            <section>
              <h2 className="text-lg font-heading font-bold">1. Introduction</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Parivartan is a non-profit initiative operated and governed by Meerut Institute of Engineering and Technology (MIET), Meerut, Uttar Pradesh. This application serves as a digital platform to connect volunteers, educators, and students, enabling easier access to educational support and community-driven learning initiatives for underprivileged rural students. By using Parivartan, you agree to the terms outlined in this policy. All rights, credits, and ownership belong to Abdul Salam (abdul.salam.bt.2024@miet.ac.in).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">2. Information We Collect</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">We collect the following types of information:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li><strong>Account Information:</strong> Name, email address, and profile details you provide during registration.</li>
                <li><strong>Content Data:</strong> Posts, comments, messages, and media you share within the platform.</li>
                <li><strong>Usage Data:</strong> Interaction patterns, feature usage, and session information to improve your experience.</li>
                <li><strong>Device Information:</strong> Device type, operating system, and browser for compatibility purposes.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">3. How We Use Your Information</h2>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Provide, maintain, and improve the Parivartan platform.</li>
                <li>Facilitate community engagement through posts, events, chat, and announcements.</li>
                <li>Send notifications about events, tasks, and platform updates.</li>
                <li>Ensure platform security and enforce community guidelines.</li>
                <li>Generate anonymized analytics to improve user experience.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">4. Data Sharing & Disclosure</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We do not sell or rent your personal information. Your data may be shared only in the following circumstances:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>With platform administrators for community management purposes.</li>
                <li>With service providers (Supabase for authentication and database) necessary to operate the platform.</li>
                <li>When required by law or to protect the safety of our users.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">5. Data Security</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We implement industry-standard security measures including encrypted data transmission (HTTPS/TLS), Row-Level Security (RLS) policies, two-factor authentication (2FA), and secure password hashing. However, no method of electronic transmission is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">6. Data Retention</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We retain your data for as long as your account is active. You may request deletion of your account and associated data by contacting us at hayatamr9608@gmail.com. Chat history with PARI can be permanently deleted at any time from within the app.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">7. Your Rights</h2>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Access, update, or delete your personal information through your profile settings.</li>
                <li>Control notification preferences and privacy settings.</li>
                <li>Request a copy of your data or its deletion by contacting the administrator.</li>
                <li>Opt out of non-essential communications.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">8. Children's Privacy</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Parivartan is intended for educational community members. We do not knowingly collect personal information from children under 13. If we discover such data, we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">9. Contact Us</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For privacy-related inquiries, contact us at{' '}
                <a href="mailto:hayatamr9608@gmail.com" className="text-primary hover:underline">hayatamr9608@gmail.com</a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}