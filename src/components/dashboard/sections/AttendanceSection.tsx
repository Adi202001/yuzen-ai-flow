import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  Calendar,
  MapPin,
  Smartphone
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  location: string | null;
  date: string;
  profiles: {
    name: string | null;
    user_id: string;
  } | null;
}

export function AttendanceSection() {
  const [showQrCode, setShowQrCode] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTodayAttendance();
    }
  }, [user]);

  const fetchTodayAttendance = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        profiles!attendance_user_id_fkey(name, user_id)
      `)
      .eq('date', today)
      .order('check_in', { ascending: true });

    if (error) {
      console.error('Error fetching attendance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance data",
        variant: "destructive",
      });
      return;
    }

    setAttendanceData(data || []);
    setLoading(false);
  };

  const markAttendance = async (isCheckOut = false) => {
    if (!user) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Check existing attendance record for today
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (isCheckOut) {
      // Handle check-out
      if (!existing) {
        toast({
          title: "No Check-in Found",
          description: "Please check in before checking out",
          variant: "destructive",
        });
        return;
      }

      if (existing.check_out) {
        toast({
          title: "Already Checked Out",
          description: "You've already checked out for today",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('attendance')
        .update({ 
          check_out: now.toISOString()
        })
        .eq('id', existing.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to mark check-out",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Check-out recorded successfully",
      });
    } else {
      // Handle check-in
      if (existing) {
        if (existing.check_out) {
          toast({
            title: "Already Completed",
            description: "You've already completed attendance for today",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Already Checked In",
          description: "You can check out when you leave",
          variant: "default",
        });
        return;
      }

      const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);

      const { error } = await supabase
        .from('attendance')
        .insert({
          user_id: user.id,
          check_in: now.toISOString(),
          status: isLate ? 'late' : 'present',
          location: 'Office',
          date: today
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to mark attendance",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Check-in recorded successfully",
      });
    }

    fetchTodayAttendance();
  };

  const todayStats = {
    present: attendanceData.filter(a => a.status === 'present').length,
    absent: attendanceData.filter(a => a.status === 'absent').length,
    late: attendanceData.filter(a => a.status === 'late').length,
    onTime: attendanceData.filter(a => a.status === 'present' && a.check_in && new Date(a.check_in).getHours() <= 9).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4" />;
      case "absent":
        return <XCircle className="h-4 w-4" />;
      case "late":
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Attendance Management</h1>
          <p className="text-muted-foreground">Track and manage team attendance with QR code scanning</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="hero" 
            onClick={() => setShowQrCode(!showQrCode)}
            className="gap-2 transition-all duration-300 hover:shadow-lg hover:scale-105"
          >
            <QrCode className="h-5 w-5" />
            {showQrCode ? "Hide QR Code" : "Show QR Code"}
          </Button>
          <Button 
            variant="outline" 
            className="gap-2 transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:border-primary hover:shadow-lg hover:scale-105"
          >
            <Calendar className="h-5 w-5" />
            View History
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-elegant group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success-light rounded-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">{todayStats.present}</h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Present Today</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-destructive-light rounded-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-2xl font-bold text-foreground group-hover:text-destructive transition-colors duration-300">{todayStats.absent}</h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Absent Today</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-warning-light rounded-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <h3 className="text-2xl font-bold text-foreground group-hover:text-warning transition-colors duration-300">{todayStats.late}</h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Late Arrivals</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">{todayStats.onTime}</h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">On Time</p>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Section */}
      {showQrCode && (
        <Card className="shadow-brand animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              QR Code Check-In/Out
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="inline-block p-8 bg-gradient-primary rounded-xl shadow-brand">
              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-32 h-32 text-gray-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mt-6 mb-2">
              {attendanceData.some(a => a.user_id === user?.id && !a.check_out) 
                ? 'Check Out' 
                : 'Check In'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {attendanceData.some(a => a.user_id === user?.id && !a.check_out)
                ? 'Click the button below to check out for the day'
                : 'Click the button below to check in for the day'}
            </p>
            <div className="flex gap-3 justify-center">
              {!attendanceData.some(a => a.user_id === user?.id) ? (
                <Button 
                  onClick={() => markAttendance(false)} 
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Clock className="h-4 w-4" />
                  Check In
                </Button>
              ) : attendanceData.some(a => a.user_id === user?.id && !a.check_out) ? (
                <Button 
                  onClick={() => markAttendance(true)} 
                  className="gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Clock className="h-4 w-4" />
                  Check Out
                </Button>
              ) : (
                <Button disabled className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Attendance Complete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance List */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Today's Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {attendanceData.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-4 rounded-lg bg-card-elevated hover:bg-secondary/50 transition-all duration-300 transform hover:scale-[1.01] hover:shadow-sm border border-transparent hover:border-border"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold group-hover:scale-110 transition-transform duration-300">
                    {employee.profiles?.name?.split(" ").map(n => n[0]).join("") || 'U'}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{employee.profiles?.name || 'Unknown User'}</h4>
                    <p className="text-sm text-muted-foreground">{employee.user_id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {employee.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{employee.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {employee.check_in ? new Date(employee.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-sm font-medium text-foreground">
                      {employee.check_out ? new Date(employee.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </span>
                    {employee.check_in && employee.check_out && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({Math.floor((new Date(employee.check_out).getTime() - new Date(employee.check_in).getTime()) / (1000 * 60 * 60))}h)
                      </span>
                    )}
                  </div>

                  <Badge className={`${getStatusColor(employee.status)} flex items-center gap-1`}>
                    {getStatusIcon(employee.status)}
                    {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}