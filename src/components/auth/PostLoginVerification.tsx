import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface PostLoginVerificationProps {
  userId: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function PostLoginVerification({ userId, onVerified, onCancel }: PostLoginVerificationProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [has2FA, setHas2FA] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  useEffect(() => {
    checkVerificationRequired();
  }, [userId]);

  const checkVerificationRequired = async () => {
    try {
      const { data, error } = await supabase
        .from('user_2fa')
        .select('enabled')
        .eq('user_id', userId)
        .single();

      if (error || !data?.enabled) {
        // No 2FA enabled - allow through
        onVerified();
        return;
      }

      setHas2FA(true);
      setIsLoading(false);
    } catch {
      onVerified();
    }
  };

  const verify2FA = async () => {
    const expectedLength = useRecoveryCode ? 8 : 6;
    if (code.length !== expectedLength) {
      toast.error(`Please enter your ${expectedLength}-character code`);
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-login-2fa', {
        body: { token: code, isRecoveryCode: useRecoveryCode }
      });

      if (error || !data?.success) {
        toast.error(useRecoveryCode ? 'Invalid recovery code' : 'Invalid verification code');
        setCode('');
        return;
      }

      onVerified();
    } catch (error: any) {
      toast.error(error.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verify2FA();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!has2FA) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            {useRecoveryCode
              ? 'Enter one of your recovery codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {useRecoveryCode ? (
              <div className="flex justify-center">
                <InputOTP
                  value={code}
                  onChange={setCode}
                  maxLength={8}
                  disabled={isVerifying}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            ) : (
              <div className="flex justify-center">
                <InputOTP
                  value={code}
                  onChange={setCode}
                  maxLength={6}
                  disabled={isVerifying}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isVerifying || code.length < (useRecoveryCode ? 8 : 6)}
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => {
                  setUseRecoveryCode(!useRecoveryCode);
                  setCode('');
                }}
                disabled={isVerifying}
              >
                {useRecoveryCode ? 'Use authenticator code instead' : 'Use a recovery code instead'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onCancel}
                disabled={isVerifying}
              >
                Cancel & Sign Out
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
