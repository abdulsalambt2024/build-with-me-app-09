import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import QRCode from 'qrcode';
import { ExternalLink, Download } from 'lucide-react';

export default function CampaignDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Generate QR code
      if (data.upi_id) {
        const { data: qrData } = await supabase
          .rpc('generate_upi_qr_data', {
            upi_id: data.upi_id,
            payee_name: data.title,
            note: `Donation to ${data.title}`
          });
        
        const qr = await QRCode.toDataURL(qrData);
        setQrCodeUrl(qr);
      }

      return data;
    }
  });

  const { data: donations = [] } = useQuery({
    queryKey: ['campaign-donations', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const donateMutation = useMutation({
    mutationFn: async (donationData: any) => {
      const { data, error } = await supabase
        .from('donations')
        .insert({
          campaign_id: id,
          user_id: user?.id,
          donor_name: isAnonymous ? null : donorName || user?.email,
          amount: parseFloat(amount),
          message,
          is_anonymous: isAnonymous,
          payment_method: 'upi',
        })
        .select()
        .single();

      if (error) throw error;

      // Generate receipt
      const receiptNumber = `PAR-${Date.now()}`;
      await supabase
        .from('donation_receipts')
        .insert({
          donation_id: data.id,
          receipt_number: receiptNumber,
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-donations', id] });
      toast.success('Thank you for your donation!');
      setAmount('');
      setDonorName('');
      setMessage('');
      setIsAnonymous(false);
    },
    onError: () => {
      toast.error('Failed to process donation');
    }
  });

  const handleUpiPayment = () => {
    if (!campaign?.upi_id) return;
    
    const upiUrl = `upi://pay?pa=${campaign.upi_id}&pn=${encodeURIComponent(campaign.title)}&am=${amount}&tn=${encodeURIComponent(`Donation to ${campaign.title}`)}`;
    window.location.href = upiUrl;
    
    // After payment, user confirms
    setTimeout(() => {
      const confirmed = confirm('Have you completed the payment?');
      if (confirmed) {
        donateMutation.mutate({});
      }
    }, 2000);
  };

  if (isLoading) {
    return <div className="container max-w-6xl mx-auto p-4">Loading...</div>;
  }

  if (!campaign) {
    return <div className="container max-w-6xl mx-auto p-4">Campaign not found</div>;
  }

  const progress = (campaign.current_amount / campaign.target_amount) * 100;

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              {campaign.banner_url && (
                <img
                  src={campaign.banner_url}
                  alt={campaign.title}
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
              )}
              <CardTitle className="text-3xl">{campaign.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground">{campaign.description}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-semibold">
                    ₹{campaign.current_amount?.toLocaleString()} / ₹{campaign.target_amount?.toLocaleString()}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Donor List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Donors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {donations.map((donation) => (
                  <div key={donation.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">
                        {donation.is_anonymous ? 'Anonymous' : donation.donor_name || 'Donor'}
                      </p>
                      {donation.message && (
                        <p className="text-sm text-muted-foreground">{donation.message}</p>
                      )}
                    </div>
                    <span className="font-semibold">₹{donation.amount?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Donation Form */}
        <div className="space-y-6">
          {/* Quick Info Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {campaign.qr_code_url && (
                <div className="text-center">
                  <img src={campaign.qr_code_url} alt="UPI QR Code" className="mx-auto w-48 h-48" />
                </div>
              )}
              
              {qrCodeUrl && !campaign.qr_code_url && (
                <div className="text-center">
                  <img src={qrCodeUrl} alt="Generated QR Code" className="mx-auto w-48 h-48" />
                </div>
              )}

              {campaign.upi_id && (
                <div className="text-center">
                  <Label>UPI ID</Label>
                  <p className="font-mono text-sm bg-muted p-2 rounded">{campaign.upi_id}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Donation Form Card */}
          <Card>
            <CardHeader>
              <CardTitle>Make a Donation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
                <div className="grid grid-cols-4 gap-2">
                  {campaign.amount_presets?.map((preset: number) => (
                    <Button
                      key={preset}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(preset.toString())}
                    >
                      ₹{preset}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={isAnonymous}
                />
              </div>

              <div className="space-y-2">
                <Label>Message (Optional)</Label>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Leave a message"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                />
                <label htmlFor="anonymous" className="text-sm cursor-pointer">
                  Donate anonymously
                </label>
              </div>

              <Button
                onClick={handleUpiPayment}
                disabled={!amount || parseFloat(amount) <= 0 || donateMutation.isPending}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Pay with UPI
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
