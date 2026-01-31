import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Loader2, Trash2, Smartphone, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BiometricCredential {
  id: string;
  credential_id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
  is_enabled: boolean;
}

// Check if WebAuthn is supported
const isWebAuthnSupported = () => {
  return !!(window.PublicKeyCredential && 
    navigator.credentials && 
    navigator.credentials.create && 
    navigator.credentials.get);
};

// Check if platform authenticator (fingerprint/face) is available
const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

export function BiometricSetup() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [hasPlatformAuth, setHasPlatformAuth] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [useForLogin, setUseForLogin] = useState(false);
  const [hasOtherAuth, setHasOtherAuth] = useState(false);

  useEffect(() => {
    checkSupport();
    if (user) {
      fetchCredentials();
      checkOtherAuth();
    }
  }, [user]);

  const checkSupport = async () => {
    const supported = isWebAuthnSupported();
    const platformAvailable = await isPlatformAuthenticatorAvailable();
    setIsSupported(supported);
    setHasPlatformAuth(platformAvailable);
  };

  const checkOtherAuth = async () => {
    if (!user) return;
    
    const [ppinRes, twoFaRes] = await Promise.all([
      supabase.from('user_ppin').select('is_enabled, use_for_login').eq('user_id', user.id).single(),
      supabase.from('user_2fa').select('enabled').eq('user_id', user.id).single()
    ]);

    const hasPpin = ppinRes.data?.is_enabled && ppinRes.data?.use_for_login;
    const has2fa = twoFaRes.data?.enabled;
    setHasOtherAuth(!!(hasPpin || has2fa));
  };

  const fetchCredentials = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_biometric')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials((data as BiometricCredential[]) || []);
      setUseForLogin(data?.some(c => c.is_enabled) || false);
    } catch (error) {
      console.error('Error fetching biometric credentials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateChallenge = (): Uint8Array => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return array;
  };

  const bufferToBase64 = (buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  };

  const base64ToBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const registerBiometric = async () => {
    if (!user || !isSupported) return;

    setIsRegistering(true);
    try {
      const challenge = generateChallenge();
      
      const userIdBuffer = new TextEncoder().encode(user.id);
      const userIdArray = new Uint8Array(userIdBuffer.buffer.slice(0));
      
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge.buffer.slice(0) as ArrayBuffer,
        rp: {
          name: 'Parivartan',
          id: window.location.hostname,
        },
        user: {
          id: userIdArray,
          name: user.email || 'user',
          displayName: user.email || 'User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use device's built-in authenticator
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('No credential created');
      }

      const attestationResponse = credential.response as AuthenticatorAttestationResponse;
      
      // Store credential in database
      const { error } = await supabase.from('user_biometric').insert({
        user_id: user.id,
        credential_id: credential.id,
        public_key: bufferToBase64(attestationResponse.getPublicKey() || new ArrayBuffer(0)),
        device_name: deviceName || getDeviceName(),
        is_enabled: true,
      });

      if (error) throw error;

      toast.success('Biometric authentication enabled!');
      setDeviceName('');
      fetchCredentials();
    } catch (error: any) {
      console.error('Biometric registration error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Biometric authentication was cancelled or not allowed');
      } else if (error.name === 'SecurityError') {
        toast.error('Security error. Please ensure you are on a secure connection.');
      } else {
        toast.error('Failed to register biometric. Please try again.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const getDeviceName = (): string => {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android Device';
    if (/Mac/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows PC';
    return 'Unknown Device';
  };

  const removeCredential = async (credentialId: string) => {
    try {
      const { error } = await supabase
        .from('user_biometric')
        .delete()
        .eq('id', credentialId);

      if (error) throw error;

      toast.success('Biometric credential removed');
      fetchCredentials();
    } catch (error) {
      toast.error('Failed to remove credential');
    }
  };

  const toggleCredential = async (credentialId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('user_biometric')
        .update({ is_enabled: enabled })
        .eq('id', credentialId);

      if (error) throw error;

      toast.success(enabled ? 'Biometric enabled for login' : 'Biometric disabled for login');
      fetchCredentials();
    } catch (error) {
      toast.error('Failed to update credential');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Biometric authentication is not supported on this device or browser.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Biometric Authentication
        </CardTitle>
        <CardDescription>
          Use fingerprint or face recognition to log in quickly and securely
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasOtherAuth && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have PPIN or 2FA enabled. Biometric can be used as an additional quick login option.
            </AlertDescription>
          </Alert>
        )}

        {!hasPlatformAuth && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No platform authenticator (fingerprint/face) detected on this device.
            </AlertDescription>
          </Alert>
        )}

        {credentials.length > 0 && (
          <div className="space-y-3">
            <Label>Registered Devices</Label>
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{cred.device_name || 'Unknown Device'}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(cred.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={cred.is_enabled}
                    onCheckedChange={(checked) => toggleCredential(cred.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCredential(cred.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasPlatformAuth && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name (Optional)</Label>
              <Input
                id="device-name"
                placeholder="e.g., My iPhone, Work Laptop"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>

            <Button
              onClick={registerBiometric}
              disabled={isRegistering}
              className="w-full"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Add Biometric Authentication
                </>
              )}
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Your biometric data never leaves your device</p>
          <p>• Works with fingerprint, Face ID, Windows Hello, etc.</p>
          <p>• Can be used alongside PPIN or 2FA for quick access</p>
        </div>
      </CardContent>
    </Card>
  );
}
