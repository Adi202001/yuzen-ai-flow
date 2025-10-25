import { useState, useEffect, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Users } from "lucide-react";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start: Date;
  end: Date;
  all_day: boolean;
  location: string | null;
  color: string;
  created_by: string;
  project_id: string | null;
  task_id: string | null;
}

interface EventFormData {
  title: string;
  description: string;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string;
  color: string;
}

export function CalendarView() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    event_type: "meeting",
    start_time: "",
    end_time: "",
    all_day: false,
    location: "",
    color: "#3b82f6",
  });

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("start_time");

      if (error) throw error;

      const formattedEvents = (data || []).map((event: any) => ({
        ...event,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
      }));

      setEvents(formattedEvents);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setFormData({
      ...formData,
      start_time: format(start, "yyyy-MM-dd'T'HH:mm"),
      end_time: format(end, "yyyy-MM-dd'T'HH:mm"),
    });
    setShowCreateDialog(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  };

  const createEvent = async () => {
    if (!user || !formData.title.trim() || !formData.start_time || !formData.end_time) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("calendar_events").insert({
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        all_day: formData.all_day,
        location: formData.location || null,
        color: formData.color,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event created successfully",
      });

      setShowCreateDialog(false);
      setFormData({
        title: "",
        description: "",
        event_type: "meeting",
        start_time: "",
        end_time: "",
        all_day: false,
        location: "",
        color: "#3b82f6",
      });
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Event deleted successfully",
      });

      setShowEventDialog(false);
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: "5px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "meeting":
        return "bg-blue-500";
      case "task_due":
        return "bg-red-500";
      case "deadline":
        return "bg-orange-500";
      case "reminder":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground">
            Manage your meetings, deadlines, and events
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Event
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div style={{ height: "700px" }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable
              eventPropGetter={eventStyleGetter}
              views={["month", "week", "day", "agenda"]}
              style={{ height: "100%" }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Event title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Event description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event_type">Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, event_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Event location"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="all_day"
                checked={formData.all_day}
                onChange={(e) =>
                  setFormData({ ...formData, all_day: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="all_day">All Day Event</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={createEvent} className="flex-1">
                Create Event
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: selectedEvent?.color }}
              />
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge className={getEventTypeColor(selectedEvent.event_type)}>
                  {selectedEvent.event_type}
                </Badge>
              </div>

              {selectedEvent.description && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(selectedEvent.start, "PPp")} -{" "}
                    {format(selectedEvent.end, "PPp")}
                  </span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => deleteEvent(selectedEvent.id)}
                  className="flex-1"
                >
                  Delete Event
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEventDialog(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
