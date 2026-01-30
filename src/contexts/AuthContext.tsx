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
  requiresVerification: boolean;
  pendingVerificationUserId: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  completeVerification: () => void;
  cancelVerification: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [pendingVerificationUserId, setPendingVerificationUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Don't update state if we're waiting for verification
        if (requiresVerification) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch role after setting session
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setRole(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [requiresVerification]);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_role', { _user_id: userId });
      
      if (error) throw error;
      setRole(data as UserRole);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole('viewer'); // Default to viewer if error
    }
  };

  const checkVerificationRequired = async (userId: string): Promise<boolean> => {
    try {
      // Check if PPIN is enabled for login
      const { data: ppinData } = await supabase
        .from('user_ppin')
        .select('is_enabled, use_for_login')
        .eq('user_id', userId)
        .single();

      if (ppinData?.is_enabled && ppinData?.use_for_login) {
        return true;
      }

      // Check if 2FA is enabled
      const { data: twoFaData } = await supabase
        .from('user_2fa')
        .select('enabled')
        .eq('user_id', userId)
        .single();

      if (twoFaData?.enabled) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Please check your email to verify your account.",
      });

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if verification is required
      const needsVerification = await checkVerificationRequired(data.user.id);
      
      if (needsVerification) {
        setPendingVerificationUserId(data.user.id);
        setRequiresVerification(true);
        // Don't set user/session yet - wait for verification
        return { error: null };
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });

      navigate('/');
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const completeVerification = async () => {
    // Verification successful - get current session and set user
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setSession(session);
      setUser(session.user);
      fetchUserRole(session.user.id);
    }
    setRequiresVerification(false);
    setPendingVerificationUserId(null);
    
    toast({
      title: "Welcome back!",
      description: "You've successfully signed in.",
    });
    
    navigate('/');
  };

  const cancelVerification = async () => {
    // User cancelled - sign them out
    await supabase.auth.signOut();
    setRequiresVerification(false);
    setPendingVerificationUserId(null);
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setSession(null);
      setRole(null);
      setRequiresVerification(false);
      setPendingVerificationUserId(null);
      
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });

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

      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        requiresVerification,
        pendingVerificationUserId,
        signUp,
        signIn,
        signOut,
        resetPassword,
        completeVerification,
        cancelVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
