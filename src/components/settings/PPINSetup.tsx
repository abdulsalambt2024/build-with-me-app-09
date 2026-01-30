import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Lock, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function PPINSetup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [ppin, setPpin] = useState('');
  const [confirmPpin, setConfirmPpin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');

  const { data: ppinSettings, isLoading } = useQuery({
    queryKey: ['ppin-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_ppin')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error && !error.message.includes('does not exist')) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Check if 2FA is enabled (mutual exclusivity)
  const { data: twoFactorEnabled } = useQuery({
    queryKey: ['2fa-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_2fa')
        .select('enabled')
        .eq('user_id', user?.id)
        .single();
      if (error && error.code !== 'PGRST116') return false;
      return data?.enabled || false;
    },
    enabled: !!user?.id
  });

  const setupPpinMutation = useMutation({
    mutationFn: async (newPpin: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Hash PPIN using SHA-256 (same as edge function)
      const encoder = new TextEncoder();
      const data = encoder.encode(newPpin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('user_ppin')
        .upsert({
          user_id: user.id,
          ppin_hash: hashHex,
          is_enabled: true,
          use_for_login: true, // Default to using for login
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppin-settings'] });
      setShowSetupDialog(false);
      setPpin('');
      setConfirmPpin('');
      setStep('enter');
      toast.success('PPIN set successfully!');
    },
    onError: () => {
      toast.error('Failed to set PPIN');
    },
  });

  const toggleSettingMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: boolean }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Check mutual exclusivity for login use
      if (field === 'use_for_login' && value && twoFactorEnabled) {
        throw new Error('Please disable 2FA first. Only one login verification method can be active at a time.');
      }
      
      const { error } = await supabase
        .from('user_ppin')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppin-settings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update setting');
    }
  });

  const handlePpinEntered = () => {
    if (ppin.length === 4) {
      setStep('confirm');
    }
  };

  const handleConfirmPpin = () => {
    if (confirmPpin === ppin) {
      setupPpinMutation.mutate(ppin);
    } else {
      toast.error('PINs do not match. Please try again.');
      setPpin('');
      setConfirmPpin('');
      setStep('enter');
    }
  };

  const hasPpin = !!ppinSettings?.ppin_hash;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            PPIN (Personal PIN)
          </CardTitle>
          <CardDescription>
            Set up a 4-digit PIN for additional security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasPpin ? (
            <div className="text-center py-4">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No PPIN configured. Set one up for extra security.
              </p>
              <Button onClick={() => setShowSetupDialog(true)}>
                Set Up PPIN
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>PPIN Enabled</Label>
                  <p className="text-xs text-muted-foreground">
                    Your PPIN is active
                  </p>
                </div>
                <Switch
                  checked={ppinSettings.is_enabled}
                  onCheckedChange={(checked) =>
                    toggleSettingMutation.mutate({ field: 'is_enabled', value: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Use for Login</Label>
                  <p className="text-xs text-muted-foreground">
                    Require PPIN after password
                  </p>
                </div>
                <Switch
                  checked={ppinSettings.use_for_login}
                  onCheckedChange={(checked) =>
                    toggleSettingMutation.mutate({ field: 'use_for_login', value: checked })
                  }
                  disabled={!ppinSettings.is_enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Use for Sensitive Actions</Label>
                  <p className="text-xs text-muted-foreground">
                    Require PPIN for critical operations
                  </p>
                </div>
                <Switch
                  checked={ppinSettings.use_for_sensitive_actions}
                  onCheckedChange={(checked) =>
                    toggleSettingMutation.mutate({ field: 'use_for_sensitive_actions', value: checked })
                  }
                  disabled={!ppinSettings.is_enabled}
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowSetupDialog(true)}
              >
                Change PPIN
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {step === 'enter' ? 'Set Your PPIN' : 'Confirm Your PPIN'}
            </DialogTitle>
            <DialogDescription>
              {step === 'enter'
                ? 'Enter a 4-digit PIN you\'ll remember'
                : 'Re-enter your PIN to confirm'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center py-6">
            {step === 'enter' ? (
              <>
                <InputOTP
                  maxLength={4}
                  value={ppin}
                  onChange={setPpin}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
                <Button
                  className="mt-6 w-full"
                  disabled={ppin.length !== 4}
                  onClick={handlePpinEntered}
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                <InputOTP
                  maxLength={4}
                  value={confirmPpin}
                  onChange={setConfirmPpin}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
                <Button
                  className="mt-6 w-full"
                  disabled={confirmPpin.length !== 4 || setupPpinMutation.isPending}
                  onClick={handleConfirmPpin}
                >
                  {setupPpinMutation.isPending ? 'Saving...' : 'Confirm PPIN'}
                </Button>
              </>
            )}
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Make sure to remember your PPIN. You'll need it for secure operations.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
