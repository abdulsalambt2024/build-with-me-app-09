import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { PostLoginVerification } from '@/components/auth/PostLoginVerification';
import parivartanLogo from '@/assets/parivartan-logo.png';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, resetPassword, user, requiresVerification, pendingVerificationUserId, completeVerification, cancelVerification } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !requiresVerification) navigate('/');
  }, [user, requiresVerification, navigate]);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', confirmPassword: '', fullName: '' });
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) { toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" }); return; }
    setIsLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    if (error) toast({ title: "Error", description: error.message || "Failed to sign in", variant: "destructive" });
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.email || !signupForm.password || !signupForm.fullName) { toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" }); return; }
    if (signupForm.password !== signupForm.confirmPassword) { toast({ title: "Error", description: "Passwords do not match", variant: "destructive" }); return; }
    if (signupForm.password.length < 6) { toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" }); return; }
    setIsLoading(true);
    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.fullName);
    if (error) toast({ title: "Error", description: error.message || "Failed to sign up", variant: "destructive" });
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) { toast({ title: "Error", description: "Please enter your email", variant: "destructive" }); return; }
    setIsLoading(true);
    const { error } = await resetPassword(resetEmail);
    if (error) toast({ title: "Error", description: error.message || "Failed to send reset email", variant: "destructive" });
    setIsLoading(false);
  };

  if (requiresVerification && pendingVerificationUserId) {
    return <PostLoginVerification userId={pendingVerificationUserId} onVerified={completeVerification} onCancel={cancelVerification} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Subtle background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -right-[20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-[30%] -left-[20%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-0 shadow-elevated relative animate-scale-in">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <img src={parivartanLogo} alt="Parivartan" className="h-20 w-20 object-contain" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-heading">Parivartan MIET</CardTitle>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">ENLIGHTEN A CHILD, DISCOVER A PERSONALITY</p>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl h-11 p-1">
              <TabsTrigger value="login" className="rounded-lg text-xs font-semibold">Login</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg text-xs font-semibold">Sign Up</TabsTrigger>
              <TabsTrigger value="reset" className="rounded-lg text-xs font-semibold">Reset</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-xs font-semibold">Email</Label>
                  <Input id="login-email" type="email" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} disabled={isLoading} placeholder="your@miet.ac.in" className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-xs font-semibold">Password</Label>
                  <div className="relative">
                    <Input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} disabled={isLoading} className="h-11 rounded-xl pr-10" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-10 rounded-xl" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-xs font-semibold">Full Name</Label>
                  <Input id="signup-name" type="text" placeholder="John Doe" value={signupForm.fullName} onChange={e => setSignupForm({ ...signupForm, fullName: e.target.value })} disabled={isLoading} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-xs font-semibold">Email</Label>
                  <Input id="signup-email" type="email" placeholder="your@miet.ac.in" value={signupForm.email} onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} disabled={isLoading} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-xs font-semibold">Password</Label>
                  <Input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={signupForm.password} onChange={e => setSignupForm({ ...signupForm, password: e.target.value })} disabled={isLoading} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs font-semibold">Confirm Password</Label>
                  <Input id="confirm-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={signupForm.confirmPassword} onChange={e => setSignupForm({ ...signupForm, confirmPassword: e.target.value })} disabled={isLoading} className="h-11 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="reset" className="mt-5">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-xs font-semibold">Email</Label>
                  <Input id="reset-email" type="email" placeholder="your@email.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} disabled={isLoading} className="h-11 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardContent className="pt-0 pb-5">
          <div className="text-center text-[10px] text-muted-foreground border-t pt-4">
            <p>Created with ❤️ by</p>
            <div className="flex items-center justify-center gap-3 mt-1.5">
              <a href="https://www.instagram.com/beinghayat.er?igsh=MXV5dXFsZW5ycHY2cw==" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-medium">Hayat(Abdul Salam)</a>
              <span>•</span>
              <a href="https://www.instagram.com/parivartan_miet?igsh=OHlnY3R5aDR5eGt6" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-medium">Parivartan</a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
