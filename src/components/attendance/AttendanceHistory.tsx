import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Download,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  work_hours: number | null;
  overtime_hours: number | null;
  location: string | null;
}

interface AttendanceHistoryProps {
  open: boolean;
  onClose: () => void;
}

export function AttendanceHistory({ open, onClose }: AttendanceHistoryProps) {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  useEffect(() => {
    if (open && user) {
      fetchHistory();
    }
  }, [open, user, startDate, endDate]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("attendance")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      // If not admin/HR, only show own records
      if (profile?.role !== "admin" && profile?.role !== "hr") {
        query = query.eq("user_id", user!.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch attendance history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (records.length === 0) {
      toast({
        title: "No Data",
        description: "No attendance records to export",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Date",
      "Check In",
      "Check Out",
      "Status",
      "Work Hours",
      "Overtime",
      "Location",
    ];
    const csvData = records.map((record) => [
      record.date,
      record.check_in
        ? format(new Date(record.check_in), "HH:mm:ss")
        : "N/A",
      record.check_out
        ? format(new Date(record.check_out), "HH:mm:ss")
        : "N/A",
      record.status,
      record.work_hours?.toFixed(2) || "0",
      record.overtime_hours?.toFixed(2) || "0",
      record.location || "N/A",
    ]);

    const csv = [headers, ...csvData].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Attendance data exported successfully",
    });
  };

  const stats = {
    totalDays: records.length,
    present: records.filter((r) => r.status === "present").length,
    late: records.filter((r) => r.status === "late").length,
    absent: records.filter((r) => r.status === "absent").length,
    totalHours: records.reduce((sum, r) => sum + (r.work_hours || 0), 0),
    totalOvertime: records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-success text-success-foreground";
      case "absent":
        return "bg-destructive text-destructive-foreground";
      case "late":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Attendance History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={fetchHistory} className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Apply Filter
                  </Button>
                  <Button onClick={exportToCSV} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.totalDays}</div>
                <div className="text-xs text-muted-foreground">Total Days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-success">
                  {stats.present}
                </div>
                <div className="text-xs text-muted-foreground">Present</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-warning">
                  {stats.late}
                </div>
                <div className="text-xs text-muted-foreground">Late</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-destructive">
                  {stats.absent}
                </div>
                <div className="text-xs text-muted-foreground">Absent</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">
                  {stats.totalHours.toFixed(1)}h
                </div>
                <div className="text-xs text-muted-foreground">Total Hours</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.totalOvertime.toFixed(1)}h
                </div>
                <div className="text-xs text-muted-foreground">Overtime</div>
              </CardContent>
            </Card>
          </div>

          {/* Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : records.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  No attendance records found for the selected period
                </div>
              ) : (
                <div className="space-y-2">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[80px]">
                          <div className="font-semibold">
                            {format(new Date(record.date), "MMM dd")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(record.date), "yyyy")}
                          </div>
                        </div>
                        <div className="h-12 w-px bg-border" />
                        <div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {record.check_in
                                ? format(new Date(record.check_in), "HH:mm")
                                : "--:--"}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">
                              {record.check_out
                                ? format(new Date(record.check_out), "HH:mm")
                                : "--:--"}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {record.location || "No location"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {record.work_hours !== null && (
                          <div className="text-center">
                            <div className="font-semibold">
                              {record.work_hours.toFixed(1)}h
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Work Hours
                            </div>
                          </div>
                        )}
                        {record.overtime_hours !== null &&
                          record.overtime_hours > 0 && (
                            <div className="text-center">
                              <div className="font-semibold text-primary">
                                +{record.overtime_hours.toFixed(1)}h
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Overtime
                              </div>
                            </div>
                          )}
                        <Badge className={getStatusColor(record.status)}>
                          {record.status.charAt(0).toUpperCase() +
                            record.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
