'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useCircle } from '@/lib/hooks/useCircle';
import { useEvents, CircleEvent } from '@/lib/hooks/useEvents';

import { UserAvatar } from '@/components/shared/UserAvatar';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Loader2, 
  ArrowRight,
  Info,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils/formatDate';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function EventsPage() {
  const params = useParams();
  const circleId = params.circleId as string;

  const { circle, loading: loadingCircle, userRole } = useCircle(circleId);
  const { events, loading: loadingEvents, createEvent, deleteEvent } = useEvents(circleId);
  const isAdmin = userRole === 'admin';

  // Forms states
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !startTime || !endTime) {
      toast.error('Please enter a title, start time, and end time');
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      toast.error('Start time must be before the end time');
      return;
    }

    setSubmitting(true);
    try {
      await createEvent(eventTitle, eventDesc, startTime, endTime);
      setEventTitle('');
      setEventDesc('');
      setStartTime('');
      setEndTime('');
      setShowEventForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatEventDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loadingCircle || !circle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-sm">Loading workspace calendar...</span>
      </div>
    );
  }

  const upcomingEvents = events.filter(e => new Date(e.end_time) >= new Date());
  const pastEvents = events.filter(e => new Date(e.end_time) < new Date());

  return (
    <div className="space-y-6 animate-fadeIn">
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowEventForm(!showEventForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold gap-1 rounded-xl self-start h-9 shadow-md shadow-indigo-600/10 animate-pulse"
          >
            <Plus className="w-4 h-4" />
            Schedule Event
          </Button>
        </div>
      )}

      {/* Event scheduler form */}
      {showEventForm && isAdmin && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm animate-fadeIn max-w-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Schedule Circle Event</span>
            <button 
              type="button" 
              onClick={() => setShowEventForm(false)} 
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <Input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Event title (e.g. Project Review Meeting)"
              disabled={submitting}
              className="text-xs h-9 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
            <Textarea
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              placeholder="Description & location details (optional)..."
              disabled={submitting}
              rows={2}
              className="text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={submitting}
                  className="w-full text-xs h-9 rounded-lg border border-slate-200 px-3 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">End Time</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={submitting}
                  className="w-full text-xs h-9 rounded-lg border border-slate-200 px-3 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowEventForm(false);
                setEventTitle('');
                setEventDesc('');
                setStartTime('');
                setEndTime('');
              }}
              disabled={submitting}
              className="h-8 text-xs rounded-lg border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs rounded-lg font-bold shadow-md shadow-indigo-600/10"
            >
              {submitting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Scheduling...</>
              ) : (
                'Publish Event'
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Events Columns Split list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Span: Upcoming Events */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <Calendar className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Upcoming Events</h3>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
              {upcomingEvents.length}
            </span>
          </div>

          {loadingEvents ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-450 space-y-2">
              <p className="text-xs font-bold text-slate-800">No upcoming events scheduled</p>
              <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-normal">
                Coordinate team meetings, reviews, deadlines, or test schedules by generating a calendar event.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div 
                  key={event.id}
                  className="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md transition-shadow relative overflow-hidden group"
                >
                  <div className="flex items-start gap-4 justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex flex-col items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h4 className="text-xs font-extrabold text-slate-900 truncate leading-snug">{event.title}</h4>
                        {event.description && (
                          <p className="text-[10px] text-slate-500 leading-normal break-words">{event.description}</p>
                        )}
                        
                        {/* Event Time range */}
                        <div className="flex flex-wrap items-center gap-1 text-[9px] font-bold text-slate-400 pt-1">
                          <Clock className="w-3 h-3 text-slate-350" />
                          <span>{formatEventDateTime(event.start_time)}</span>
                          <ChevronRight className="w-2.5 h-2.5" />
                          <span>{formatEventDateTime(event.end_time)}</span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all cursor-pointer shrink-0"
                        title="Delete event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Span: Past Events history list */}
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 mb-1 px-1 select-none">
            <Info className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Past Events</h3>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
              {pastEvents.length}
            </span>
          </div>

          {loadingEvents ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
            </div>
          ) : pastEvents.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 italic text-center">No past events recorded.</p>
          ) : (
            <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
              {pastEvents.map((event) => (
                <div 
                  key={event.id}
                  className="bg-white rounded-xl border border-slate-100 p-3.5 shadow-sm"
                >
                  <h4 className="text-xs font-bold text-slate-700 line-clamp-1">{event.title}</h4>
                  <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 mt-1.5">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <span>{formatEventDateTime(event.start_time)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
