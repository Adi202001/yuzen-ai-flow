import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coffee, Play, StopCircle, Clock } from "lucide-react";
import { format, formatDistance } from "date-fns";

interface AttendanceBreak {
  id: string;
  attendance_id: string;
  break_start: string;
  break_end: string | null;
  break_type: string;
  notes: string | null;
}

interface BreakTrackingProps {
  attendanceId: string | null;
  onBreakUpdate?: () => void;
}

export function BreakTracking({ attendanceId, onBreakUpdate }: BreakTrackingProps) {
  const { user } = useAuth();
  const [breaks, setBreaks] = useState<AttendanceBreak[]>([]);
  const [activeBreak, setActiveBreak] = useState<AttendanceBreak | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (attendanceId) {
      fetchBreaks();
    }
  }, [attendanceId]);

  // Update current time every second for active break timer
  useEffect(() => {
    if (activeBreak) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeBreak]);

  const fetchBreaks = async () => {
    if (!attendanceId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance_breaks")
        .select("*")
        .eq("attendance_id", attendanceId)
        .order("break_start", { ascending: false });

      if (error) throw error;

      const breaks = data || [];
      setBreaks(breaks);

      // Find active break (break without end time)
      const active = breaks.find((b) => !b.break_end);
      setActiveBreak(active || null);
    } catch (error: any) {
      console.error("Error fetching breaks:", error);
    } finally {
      setLoading(false);
    }
  };

  const startBreak = async (breakType: string = "break") => {
    if (!attendanceId || !user) {
      toast({
        title: "Error",
        description: "Please check in first before starting a break",
        variant: "destructive",
      });
      return;
    }

    if (activeBreak) {
      toast({
        title: "Break Already Active",
        description: "Please end your current break first",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("attendance_breaks")
        .insert({
          attendance_id: attendanceId,
          break_start: new Date().toISOString(),
          break_type: breakType,
        })
        .select()
        .single();

      if (error) throw error;

      setActiveBreak(data);
      setBreaks([data, ...breaks]);

      toast({
        title: "Break Started",
        description: `Your ${breakType} has started`,
      });

      onBreakUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start break",
        variant: "destructive",
      });
    }
  };

  const endBreak = async () => {
    if (!activeBreak) return;

    try {
      const { data, error } = await supabase
        .from("attendance_breaks")
        .update({ break_end: new Date().toISOString() })
        .eq("id", activeBreak.id)
        .select()
        .single();

      if (error) throw error;

      setBreaks(breaks.map((b) => (b.id === data.id ? data : b)));
      setActiveBreak(null);

      const duration = formatBreakDuration(
        new Date(activeBreak.break_start),
        new Date()
      );

      toast({
        title: "Break Ended",
        description: `Break duration: ${duration}`,
      });

      onBreakUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to end break",
        variant: "destructive",
      });
    }
  };

  const formatBreakDuration = (start: Date, end: Date): string => {
    const diffMs = end.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTotalBreakTime = (): string => {
    const totalMinutes = breaks.reduce((sum, b) => {
      if (b.break_end) {
        const start = new Date(b.break_start);
        const end = new Date(b.break_end);
        const diffMs = end.getTime() - start.getTime();
        return sum + Math.floor(diffMs / 60000);
      }
      return sum;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getBreakIcon = (type: string) => {
    switch (type) {
      case "lunch":
        return "🍽️";
      case "coffee":
        return "☕";
      default:
        return "⏸️";
    }
  };

  if (!attendanceId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Coffee className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Check in first to track breaks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-primary" />
            Break Tracking
          </div>
          <Badge variant="outline">Total: {getTotalBreakTime()}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Break Timer */}
        {activeBreak && (
          <div className="bg-primary/10 border border-primary rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="animate-pulse">
                  <StopCircle className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">
                  {activeBreak.break_type.charAt(0).toUpperCase() +
                    activeBreak.break_type.slice(1)}{" "}
                  Break Active
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                Started{" "}
                {format(new Date(activeBreak.break_start), "HH:mm:ss")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold tabular-nums">
                {formatBreakDuration(
                  new Date(activeBreak.break_start),
                  currentTime
                )}
              </div>
              <Button onClick={endBreak} variant="destructive" size="sm">
                <StopCircle className="h-4 w-4 mr-2" />
                End Break
              </Button>
            </div>
          </div>
        )}

        {/* Break Action Buttons */}
        {!activeBreak && (
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => startBreak("break")}
              variant="outline"
              className="gap-2"
            >
              <Coffee className="h-4 w-4" />
              Break
            </Button>
            <Button
              onClick={() => startBreak("lunch")}
              variant="outline"
              className="gap-2"
            >
              🍽️ Lunch
            </Button>
            <Button
              onClick={() => startBreak("coffee")}
              variant="outline"
              className="gap-2"
            >
              ☕ Coffee
            </Button>
          </div>
        )}

        {/* Break History */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">
            Today's Breaks
          </h4>
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : breaks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No breaks recorded yet
            </p>
          ) : (
            <div className="space-y-2">
              {breaks.map((breakItem) => (
                <div
                  key={breakItem.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {getBreakIcon(breakItem.break_type)}
                    </span>
                    <div>
                      <div className="font-medium">
                        {breakItem.break_type.charAt(0).toUpperCase() +
                          breakItem.break_type.slice(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(breakItem.break_start), "HH:mm")}
                        {breakItem.break_end && (
                          <>
                            {" → "}
                            {format(new Date(breakItem.break_end), "HH:mm")}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {breakItem.break_end ? (
                      <Badge variant="secondary">
                        {formatBreakDuration(
                          new Date(breakItem.break_start),
                          new Date(breakItem.break_end)
                        )}
                      </Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
