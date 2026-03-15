import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

type UserRole = 'viewer' | 'member' | 'admin' | 'super_admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  isGuest: boolean;
  requiresVerification: boolean;
  pendingVerificationUserId: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  continueAsViewer: () => void;
  completeVerification: () => void;
  cancelVerification: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [pendingVerificationUserId, setPendingVerificationUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if guest session exists
    const guestSession = sessionStorage.getItem('parivartan_guest');
    if (guestSession) {
      setIsGuest(true);
      setRole('viewer');
      setUser({ id: 'guest', email: 'viewer@guest.local' } as any);
      setLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (requiresVerification) return;
        if (isGuest && !session) return; // Don't clear guest on no session
        setSession(session);
        setUser(session?.user ?? (isGuest ? { id: 'guest', email: 'viewer@guest.local' } as any : null));
        if (session?.user) {
          setIsGuest(false);
          sessionStorage.removeItem('parivartan_guest');
          setTimeout(() => fetchUserRole(session.user.id), 0);
        } else if (!isGuest) {
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        setIsGuest(false);
        sessionStorage.removeItem('parivartan_guest');
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [requiresVerification]);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_role', { _user_id: userId });
      if (error) throw error;
      setRole(data as UserRole);
    } catch {
      setRole('viewer');
    }
  };

  const check2FARequired = async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('user_2fa')
        .select('enabled')
        .eq('user_id', userId)
        .single();
      return data?.enabled || false;
    } catch {
      return false;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
      toast({ title: "Success!", description: "Please check your email to verify your account." });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Clear guest state on real login
      setIsGuest(false);
      sessionStorage.removeItem('parivartan_guest');

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const needs2FA = await check2FARequired(data.user.id);
      if (needs2FA) {
        setPendingVerificationUserId(data.user.id);
        setRequiresVerification(true);
        return { error: null };
      }

      toast({ title: "Welcome back!", description: "You've successfully signed in." });
      navigate('/');
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const continueAsViewer = () => {
    sessionStorage.setItem('parivartan_guest', 'true');
    setIsGuest(true);
    setRole('viewer');
    setUser({ id: 'guest', email: 'viewer@guest.local' } as any);
    toast({ title: "Welcome!", description: "You're browsing as a Viewer. Sign in for full access." });
    navigate('/');
  };

  const completeVerification = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setSession(session);
      setUser(session.user);
      fetchUserRole(session.user.id);
    }
    setRequiresVerification(false);
    setPendingVerificationUserId(null);
    toast({ title: "Welcome back!", description: "You've successfully signed in." });
    navigate('/');
  };

  const cancelVerification = async () => {
    await supabase.auth.signOut();
    setRequiresVerification(false);
    setPendingVerificationUserId(null);
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const signOut = async () => {
    try {
      if (isGuest) {
        sessionStorage.removeItem('parivartan_guest');
        setIsGuest(false);
        setUser(null);
        setSession(null);
        setRole(null);
        toast({ title: "Signed out", description: "You've exited viewer mode." });
        navigate('/auth');
        return;
      }
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
      setRequiresVerification(false);
      setPendingVerificationUserId(null);
      toast({ title: "Signed out", description: "You've been successfully signed out." });
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "Check your email", description: "We've sent you a password reset link." });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, role, loading, isGuest, requiresVerification, pendingVerificationUserId,
      signUp, signIn, signOut, resetPassword, continueAsViewer, completeVerification, cancelVerification,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}