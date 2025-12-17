import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useCampaigns, useDeleteCampaign } from '@/hooks/useDonations';
import { Heart, TrendingUp, Calendar, Plus, Trash2 } from 'lucide-react';
import { CreateCampaignDialog } from '@/components/donations/CreateCampaignDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Donations() {
  const { data: campaigns, isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [deletingCampaign, setDeletingCampaign] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const isAdmin = role === 'admin' || role === 'super_admin';

  const handleDonate = (campaign: any) => {
    // Try to open UPI app on mobile
    if (campaign.upi_id) {
      const amount = campaign.amount_presets?.[0] || 100;
      const upiLink = `upi://pay?pa=${campaign.upi_id}&pn=${encodeURIComponent('PARIVARTAN')}&am=${amount}&tn=${encodeURIComponent(campaign.title)}`;
      
      // Try to open UPI link
      window.location.href = upiLink;
      
      // Fallback to campaign detail page after a short delay
      setTimeout(() => {
        navigate(`/donations/${campaign.id}`);
      }, 1000);
    } else {
      navigate(`/donations/${campaign.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Donation Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Support causes that matter to our community
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Create</span>
          </Button>
        )}
      </div>

      {campaigns && campaigns.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => {
            const progress = (campaign.current_amount / campaign.target_amount) * 100;
            const daysLeft = campaign.end_date
              ? Math.ceil((new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <Card key={campaign.id} className="overflow-hidden">
                {campaign.banner_url && (
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={campaign.banner_url}
                      alt={campaign.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-base">{campaign.title}</CardTitle>
                    {role === 'super_admin' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => setDeletingCampaign(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {campaign.category && (
                    <CardDescription className="capitalize text-xs">
                      {campaign.category}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {campaign.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        ₹{campaign.current_amount.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        of ₹{campaign.target_amount.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {progress.toFixed(0)}%
                      </div>
                      {daysLeft !== null && daysLeft > 0 && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {daysLeft}d left
                        </div>
                      )}
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => handleDonate(campaign)}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Donate Now
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No active campaigns at the moment</p>
          </CardContent>
        </Card>
      )}
      
      <CreateCampaignDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

      <AlertDialog open={!!deletingCampaign} onOpenChange={(open) => !open && setDeletingCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingCampaign) {
                  deleteCampaign.mutate(deletingCampaign);
                  setDeletingCampaign(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}