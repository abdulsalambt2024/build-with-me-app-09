import { Calendar, MapPin, Users, ExternalLink, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Event, useDeleteEvent } from '@/hooks/useEvents';
import { useAuth } from '@/contexts/AuthContext';
import { useRSVP } from '@/hooks/useEvents';
import { useState } from 'react';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const { user, role } = useAuth();
  const rsvp = useRSVP();
  const deleteEvent = useDeleteEvent();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const userRSVP = event.event_rsvps?.find((r) => r.user_id === user?.id);
  const isPast = new Date(event.event_date) < new Date();
  const isSuperAdmin = role === 'super_admin';

  const handleRSVP = (status: 'going' | 'interested' | 'not_going') => {
    if (isPast) return; // Block registration for past events
    rsvp.mutate({ eventId: event.id, status });
  };

  const handleDelete = () => {
    deleteEvent.mutate(event.id);
    setDeleteConfirm(false);
  };

  return (
    <>
      <Card className={isPast ? 'opacity-60' : ''}>
        {event.banner_url && (
          <div className="w-full h-48 overflow-hidden rounded-t-lg">
            <img
              src={event.banner_url}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(event.event_date), 'PPP p')}
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {event.attendees_count} attending
                  {event.max_attendees && ` / ${event.max_attendees}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPast && <Badge variant="secondary">Past</Badge>}
              {userRSVP && !isPast && (
                <Badge variant={userRSVP.status === 'going' ? 'default' : 'secondary'}>
                  {userRSVP.status === 'going' ? 'Going' : 
                   userRSVP.status === 'interested' ? 'Interested' : 'Not Going'}
                </Badge>
              )}
              {isSuperAdmin && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(true)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-muted-foreground line-clamp-3">{event.description}</p>
        </CardContent>

        <CardFooter className="flex gap-2">
          {!isPast && (
            <>
              <Button
                variant={userRSVP?.status === 'going' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRSVP('going')}
                disabled={rsvp.isPending}
              >
                Going
              </Button>
              <Button
                variant={userRSVP?.status === 'interested' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRSVP('interested')}
                disabled={rsvp.isPending}
              >
                Interested
              </Button>
            </>
          )}
          {!isPast && event.registration_url && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="ml-auto"
            >
              <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Register
              </a>
            </Button>
          )}
          {isPast && (
            <p className="text-sm text-muted-foreground italic">Registration closed for past events</p>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{event.title}" and all associated RSVPs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}