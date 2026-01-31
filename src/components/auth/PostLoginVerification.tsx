import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, KeyRound, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface PostLoginVerificationProps {
  userId: string;
  onVerified: () => void;
  onCancel: () => void;
}

type VerificationType = 'ppin' | '2fa' | 'biometric' | null;

export function PostLoginVerification({ userId, onVerified, onCancel }: PostLoginVerificationProps) {
  const [verificationType, setVerificationType] = useState<VerificationType>(null);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const verifyBiometric = useCallback(async () => {
    setIsVerifying(true);
    try {
      // Get the user's biometric credentials
      const { data: credentials, error: credError } = await supabase
        .from('user_biometric')
        .select('credential_id, public_key')
        .eq('user_id', userId)
        .eq('is_enabled', true);

      if (credError || !credentials || credentials.length === 0) {
        toast.error('No biometric credentials found');
        setVerificationType('ppin');
        return;
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const allowCredentials = credentials.map(cred => ({
        id: Uint8Array.from(atob(cred.credential_id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
        type: 'public-key' as const,
      }));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge.buffer as ArrayBuffer,
        allowCredentials,
        userVerification: 'required',
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      if (assertion) {
        // Update last used timestamp
        await supabase
          .from('user_biometric')
          .update({ last_used_at: new Date().toISOString() })
          .eq('user_id', userId);

        onVerified();
      }
    } catch (error: any) {
      console.error('Biometric verification error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric verification was cancelled');
      } else {
        toast.error('Biometric verification failed. Please use your PPIN or 2FA.');
      }
      // Fall back to other verification method if available
      setIsLoading(true);
      // Re-check for other verification methods
      checkOtherVerificationMethods();
    } finally {
      setIsVerifying(false);
    }
  }, [userId, onVerified]);

  const checkOtherVerificationMethods = async () => {
    const [ppinRes, twoFaRes] = await Promise.all([
      supabase.from('user_ppin').select('is_enabled, use_for_login').eq('user_id', userId).single(),
      supabase.from('user_2fa').select('enabled').eq('user_id', userId).single()
    ]);

    if (ppinRes.data?.is_enabled && ppinRes.data?.use_for_login) {
      setVerificationType('ppin');
    } else if (twoFaRes.data?.enabled) {
      setVerificationType('2fa');
    } else {
      // No other verification - allow through
      onVerified();
    }
    setIsLoading(false);
  };

  useEffect(() => {
    checkVerificationRequired();
  }, [userId]);

  const checkVerificationRequired = async () => {
    try {
      // Check all verification methods in parallel
      const [ppinRes, twoFaRes, biometricRes] = await Promise.all([
        supabase.from('user_ppin').select('is_enabled, use_for_login, locked_until').eq('user_id', userId).single(),
        supabase.from('user_2fa').select('enabled').eq('user_id', userId).single(),
        supabase.from('user_biometric').select('is_enabled').eq('user_id', userId).eq('is_enabled', true).limit(1)
      ]);

      const ppinData = ppinRes.data;
      const twoFaData = twoFaRes.data;
      const biometricData = biometricRes.data;

      // Check if biometric is available for quick login
      const hasBiometricEnabled = biometricData && biometricData.length > 0;
      setHasBiometric(hasBiometricEnabled);

      // Priority: PPIN > 2FA (only one can be active at a time per the mutual exclusivity)
      if (ppinData?.is_enabled && ppinData?.use_for_login) {
        // Check if locked
        if (ppinData.locked_until && new Date(ppinData.locked_until) > new Date()) {
          toast.error('Account temporarily locked. Try again later.');
          onCancel();
          return;
        }
        setVerificationType('ppin');
        setIsLoading(false);
        return;
      }

      if (twoFaData?.enabled) {
        setVerificationType('2fa');
        setIsLoading(false);
        return;
      }

      // If biometric is enabled but no PPIN/2FA, try biometric
      if (hasBiometricEnabled) {
        setVerificationType('biometric');
        setIsLoading(false);
        return;
      }

      // No verification required
      onVerified();
    } catch (error) {
      // No verification records found - allow login
      onVerified();
    }
  };

  const verifyPPIN = async () => {
    if (code.length !== 4) {
      toast.error('Please enter your 4-digit PPIN');
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-ppin', {
        body: { ppin: code }
      });

      if (error || !data?.success) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        
        if (newAttempts >= 5) {
          toast.error('Too many failed attempts. Account locked for 15 minutes.');
          onCancel();
        } else {
          toast.error(`Invalid PPIN. ${5 - newAttempts} attempts remaining.`);
        }
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

  const verify2FA = async () => {
    if (code.length !== 6) {
      toast.error('Please enter your 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-login-2fa', {
        body: { token: code }
      });

      if (error || !data?.success) {
        toast.error('Invalid verification code');
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
    if (verificationType === 'ppin') {
      verifyPPIN();
    } else if (verificationType === '2fa') {
      verify2FA();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Biometric verification screen
  if (verificationType === 'biometric') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <Fingerprint className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-xl">Biometric Verification</CardTitle>
            <CardDescription>
              Use your fingerprint or face to verify your identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={verifyBiometric}
              disabled={isVerifying}
              className="w-full"
              size="lg"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Verify with Biometrics
                </>
              )}
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            {verificationType === 'ppin' ? (
              <KeyRound className="h-12 w-12 text-primary" />
            ) : (
              <Shield className="h-12 w-12 text-primary" />
            )}
          </div>
          <CardTitle className="text-xl">
            {verificationType === 'ppin' ? 'Enter Your PPIN' : 'Two-Factor Authentication'}
          </CardTitle>
          <CardDescription>
            {verificationType === 'ppin'
              ? 'Enter your 4-digit Personal PIN to continue'
              : 'Enter the 6-digit code from your authenticator app'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {verificationType === 'ppin' ? (
              <div className="flex justify-center">
                <InputOTP
                  value={code}
                  onChange={setCode}
                  maxLength={4}
                  disabled={isVerifying}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
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

            {/* Show biometric option if available */}
            {hasBiometric && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={verifyBiometric}
                disabled={isVerifying}
              >
                <Fingerprint className="mr-2 h-4 w-4" />
                Use Biometrics Instead
              </Button>
            )}

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isVerifying || (verificationType === 'ppin' ? code.length !== 4 : code.length !== 6)}
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
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
