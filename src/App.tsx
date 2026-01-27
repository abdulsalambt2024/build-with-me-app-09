import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ColorSchemeProvider } from "@/contexts/ColorSchemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/layout/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load pages for better performance
const Home = lazy(() => import("./pages/Home"));
const Posts = lazy(() => import("./pages/Posts"));
const Events = lazy(() => import("./pages/Events"));
const Chat = lazy(() => import("./pages/Chat"));
const Profile = lazy(() => import("./pages/Profile"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Donations = lazy(() => import("./pages/Donations"));
const AIStudio = lazy(() => import("./pages/AIStudio"));
const Admin = lazy(() => import("./pages/Admin"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const ContentModeration = lazy(() => import("./pages/admin/ContentModeration"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const AdminTasks = lazy(() => import("./pages/admin/AdminTasks"));
const ErrorLogs = lazy(() => import("./pages/admin/ErrorLogs"));
const PaymentTransactions = lazy(() => import("./pages/admin/PaymentTransactions"));
const Attendance = lazy(() => import("./pages/admin/Attendance"));
const SlideshowManager = lazy(() => import("./pages/admin/SlideshowManager"));
const BadgeManagement = lazy(() => import("./pages/admin/BadgeManagement"));
const PopupManager = lazy(() => import("./pages/admin/PopupManager"));
const ChatbotFAQ = lazy(() => import("./pages/admin/ChatbotFAQ"));
const PerformanceDashboard = lazy(() => import("./pages/PerformanceDashboard"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const CampaignDetail = lazy(() => import("./pages/CampaignDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const Help = lazy(() => import("./pages/Help"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md p-4">
      <Skeleton className="h-12 w-3/4 mx-auto" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ColorSchemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public route */}
                    <Route path="/auth" element={<Auth />} />
                    
                    {/* Protected routes */}
                    <Route path="/" element={<Layout><ProtectedRoute><Home /></ProtectedRoute></Layout>} />
                    <Route path="/posts" element={<Layout><ProtectedRoute><Posts /></ProtectedRoute></Layout>} />
                    <Route path="/events" element={<Layout><ProtectedRoute><Events /></ProtectedRoute></Layout>} />
                    <Route path="/chat" element={<Layout><ProtectedRoute><Chat /></ProtectedRoute></Layout>} />
                    <Route path="/profile" element={<Layout><ProtectedRoute><Profile /></ProtectedRoute></Layout>} />
                    <Route path="/profile/edit" element={<Layout><ProtectedRoute><ProfileEdit /></ProtectedRoute></Layout>} />
                    <Route path="/achievements" element={<Layout><ProtectedRoute><Achievements /></ProtectedRoute></Layout>} />
                    <Route path="/announcements" element={<Layout><ProtectedRoute><Announcements /></ProtectedRoute></Layout>} />
                    <Route path="/donations" element={<Layout><ProtectedRoute><Donations /></ProtectedRoute></Layout>} />
                    <Route path="/ai-studio" element={<Layout><ProtectedRoute requiredRole="member"><AIStudio /></ProtectedRoute></Layout>} />
                    <Route path="/admin" element={<Layout><ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute></Layout>} />
                    <Route path="/admin/users" element={<Layout><ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute></Layout>} />
                    <Route path="/admin/moderation" element={<Layout><ProtectedRoute requiredRole="admin"><ContentModeration /></ProtectedRoute></Layout>} />
                    <Route path="/admin/analytics" element={<Layout><ProtectedRoute requiredRole="admin"><Analytics /></ProtectedRoute></Layout>} />
                    <Route path="/admin/tasks" element={<Layout><ProtectedRoute requiredRole="admin"><AdminTasks /></ProtectedRoute></Layout>} />
                    <Route path="/admin/errors" element={<Layout><ProtectedRoute requiredRole="super_admin"><ErrorLogs /></ProtectedRoute></Layout>} />
                    <Route path="/admin/payments" element={<Layout><ProtectedRoute requiredRole="admin"><PaymentTransactions /></ProtectedRoute></Layout>} />
                    <Route path="/admin/attendance" element={<Layout><ProtectedRoute requiredRole="admin"><Attendance /></ProtectedRoute></Layout>} />
                    <Route path="/admin/slideshow" element={<Layout><ProtectedRoute requiredRole="admin"><SlideshowManager /></ProtectedRoute></Layout>} />
                    <Route path="/admin/badges" element={<Layout><ProtectedRoute requiredRole="super_admin"><BadgeManagement /></ProtectedRoute></Layout>} />
                    <Route path="/admin/popups" element={<Layout><ProtectedRoute requiredRole="super_admin"><PopupManager /></ProtectedRoute></Layout>} />
                    <Route path="/admin/chatbot-faq" element={<Layout><ProtectedRoute requiredRole="admin"><ChatbotFAQ /></ProtectedRoute></Layout>} />
                    <Route path="/performance" element={<Layout><ProtectedRoute><PerformanceDashboard /></ProtectedRoute></Layout>} />
                    <Route path="/donations/:id" element={<Layout><ProtectedRoute><CampaignDetail /></ProtectedRoute></Layout>} />
                    <Route path="/settings" element={<Layout><ProtectedRoute><Settings /></ProtectedRoute></Layout>} />
                    <Route path="/help" element={<Layout><ProtectedRoute><Help /></ProtectedRoute></Layout>} />
                    <Route path="*" element={<Layout><NotFound /></Layout>} />
                  </Routes>
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ColorSchemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
