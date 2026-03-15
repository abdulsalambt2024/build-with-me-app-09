import { Card, CardContent } from '@/components/ui/card';
import { FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
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
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-heading font-bold">Terms of Service</h1>
          </div>
        </div>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none space-y-5">
            <p className="text-xs text-muted-foreground">Last Updated: March 15, 2026</p>

            <section>
              <h2 className="text-lg font-heading font-bold">1. Acceptance of Terms</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                By accessing or using Parivartan ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">2. Description of Service</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Parivartan is a community engagement platform developed by Parivartan MIET for the purpose of educating and empowering rural youth. The platform provides features including content sharing, event management, group chat, AI creative tools, donation campaigns, and administrative tools.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">3. User Accounts & Roles</h2>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Users must provide accurate information during registration.</li>
                <li>Users are responsible for maintaining the confidentiality of their credentials.</li>
                <li>The platform operates with four roles: Viewer, Member, Admin, and Super Admin, each with specific permissions.</li>
                <li>Guest viewers may access limited features without registration.</li>
                <li>Role assignments are managed by administrators and may change.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">4. Acceptable Use</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">You agree NOT to:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Post offensive, harmful, misleading, or illegal content.</li>
                <li>Impersonate other users or misrepresent your identity.</li>
                <li>Attempt to access unauthorized areas of the platform.</li>
                <li>Use the platform for spam, phishing, or malicious activities.</li>
                <li>Reverse engineer or attempt to compromise platform security.</li>
                <li>Violate any applicable local, state, national, or international law.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">5. Content Ownership</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You retain ownership of content you create and share on the platform. By posting content, you grant Parivartan a non-exclusive license to display and distribute your content within the platform. Administrators may remove content that violates community guidelines.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">6. Donations</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Donations made through the platform are voluntary. Parivartan facilitates donation campaigns but is not responsible for the use of donated funds beyond what is stated in each campaign description. All transactions are processed through secure payment gateways.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">7. AI Features</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI Studio features are provided for creative and educational purposes. AI-generated content should be used responsibly. We do not guarantee the accuracy or appropriateness of AI-generated outputs.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">8. Account Termination</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate accounts that violate these terms. Users may request account deletion by contacting the administrator. Super Admins can disable accounts for policy violations.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">9. Limitation of Liability</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Parivartan is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">10. Changes to Terms</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We may update these Terms of Service periodically. Continued use of the platform after changes constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-heading font-bold">11. Contact</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For questions about these terms, contact us at{' '}
                <a href="mailto:hayatamr9608@gmail.com" className="text-primary hover:underline">hayatamr9608@gmail.com</a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}