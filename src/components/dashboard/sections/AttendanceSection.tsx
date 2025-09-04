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
        profiles!attendance_user_id_fkey (name, user_id)
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

  const markAttendance = async () => {
    if (!user) return;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Check if already marked today
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (existing) {
      toast({
        title: "Already Marked",
        description: "Attendance already marked for today",
        variant: "destructive",
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
      description: "Attendance marked successfully",
    });

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
            className="gap-2"
          >
            <QrCode className="h-5 w-5" />
            {showQrCode ? "Hide QR Code" : "Show QR Code"}
          </Button>
          <Button variant="outline" className="gap-2">
            <Calendar className="h-5 w-5" />
            View History
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success-light rounded-lg mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{todayStats.present}</h3>
            <p className="text-sm text-muted-foreground">Present Today</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-destructive-light rounded-lg mx-auto mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{todayStats.absent}</h3>
            <p className="text-sm text-muted-foreground">Absent Today</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-warning-light rounded-lg mx-auto mb-4">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{todayStats.late}</h3>
            <p className="text-sm text-muted-foreground">Late Arrivals</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success-light rounded-lg mx-auto mb-4">
              <Users className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{todayStats.onTime}</h3>
            <p className="text-sm text-muted-foreground">On Time</p>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Section */}
      {showQrCode && (
        <Card className="shadow-brand animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              QR Code Check-In
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="inline-block p-8 bg-gradient-primary rounded-xl shadow-brand">
              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-32 h-32 text-gray-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mt-6 mb-2">Quick Check-In</h3>
            <p className="text-muted-foreground mb-4">
              Click the button below to mark your attendance for today
            </p>
            <Button onClick={markAttendance} className="gap-2">
              <Clock className="h-4 w-4" />
              Mark Attendance
            </Button>
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
                  className="flex items-center justify-between p-4 rounded-lg bg-card-elevated hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
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
                    
                    <div className="text-right">
                      {employee.check_in && (
                        <p className="text-sm font-medium text-foreground">
                          In: {new Date(employee.check_in).toLocaleTimeString()}
                        </p>
                      )}
                      {employee.check_out && (
                        <p className="text-sm text-muted-foreground">
                          Out: {new Date(employee.check_out).toLocaleTimeString()}
                        </p>
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