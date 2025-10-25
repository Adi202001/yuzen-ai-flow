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
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { AttendanceHistory } from '@/components/attendance/AttendanceHistory';
import { BreakTracking } from '@/components/attendance/BreakTracking';
import { QRCodeSVG } from 'qrcode.react';
import {
  getCurrentLocation,
  isWithinOfficeRadius,
  getDeviceInfo,
  getUserTimezone,
  GeolocationData
} from '@/utils/geolocation';

interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  date: string;
  work_hours: number | null;
  overtime_hours: number | null;
  profiles: {
    name: string | null;
    user_id: string;
  } | null;
}

interface OfficeSettings {
  id: string;
  start_time: string;
  grace_period_minutes: number;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  working_hours_per_day: number;
}

export function AttendanceSection() {
  const [showQrCode, setShowQrCode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [officeSettings, setOfficeSettings] = useState<OfficeSettings | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user) {
      fetchOfficeSettings();
      fetchTodayAttendance();
      generateQRCode();
    }
  }, [user]);

  const fetchOfficeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('office_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setOfficeSettings(data);
    } catch (error) {
      console.error('Error fetching office settings:', error);
    }
  };

  const generateQRCode = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('generate_daily_qr_code', { p_user_id: user.id });

      if (error) {
        // If function doesn't exist, use fallback
        const qrData = `${user.id}-${new Date().toISOString()}`;
        setQrCodeData(qrData);
      } else {
        setQrCodeData(data);
      }
    } catch (error) {
      // Fallback QR code
      const qrData = `${user.id}-${new Date().toISOString()}`;
      setQrCodeData(qrData);
    }
  };

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

    // Find today's attendance for current user
    const myAttendance = data?.find(a => a.user_id === user?.id);
    setTodayAttendance(myAttendance || null);

    setLoading(false);
  };

  const markAttendance = async (isCheckOut = false) => {
    if (!user) return;

    try {
      // Get geolocation
      let locationData: GeolocationData | null = null;
      let locationValid = true;

      try {
        locationData = await getCurrentLocation();

        // Validate location if office has coordinates
        if (officeSettings?.latitude && officeSettings?.longitude && locationData) {
          const result = isWithinOfficeRadius(locationData, {
            latitude: officeSettings.latitude,
            longitude: officeSettings.longitude,
            radius_meters: officeSettings.radius_meters,
          });

          if (!result.withinRadius) {
            const proceed = window.confirm(
              `You are ${result.distance}m away from the office. Continue anyway?`
            );
            if (!proceed) return;
            locationValid = false;
          }
        }
      } catch (geoError: any) {
        console.error('Geolocation error:', geoError);
        toast({
          title: "Location Warning",
          description: geoError.message,
          variant: "default",
        });
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];

      if (isCheckOut) {
        // Handle check-out
        if (!todayAttendance) {
          toast({
            title: "No Check-in Found",
            description: "Please check in before checking out",
            variant: "destructive",
          });
          return;
        }

        if (todayAttendance.check_out) {
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
            check_out: now.toISOString(),
            latitude: locationData?.latitude || null,
            longitude: locationData?.longitude || null,
          })
          .eq('id', todayAttendance.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Check-out recorded successfully",
        });
      } else {
        // Handle check-in
        if (todayAttendance) {
          if (todayAttendance.check_out) {
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

        // Calculate if late
        const officeStartTime = officeSettings?.start_time || '09:00:00';
        const gracePeriod = officeSettings?.grace_period_minutes || 0;

        const [hours, minutes] = officeStartTime.split(':').map(Number);
        const officeStart = new Date(now);
        officeStart.setHours(hours, minutes + gracePeriod, 0, 0);

        const isLate = now > officeStart;

        const { error } = await supabase
          .from('attendance')
          .insert({
            user_id: user.id,
            check_in: now.toISOString(),
            status: isLate ? 'late' : 'present',
            location: locationData ?
              `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}` :
              'Location unavailable',
            latitude: locationData?.latitude || null,
            longitude: locationData?.longitude || null,
            timezone: getUserTimezone(),
            device_info: getDeviceInfo(),
            date: today
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: isLate ?
            "Check-in recorded (Late arrival)" :
            "Check-in recorded successfully",
        });
      }

      fetchTodayAttendance();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance",
        variant: "destructive",
      });
    }
  };

  // Optimized stats calculation
  const todayStats = attendanceData.reduce((acc, a) => {
    if (a.status === 'present') acc.present++;
    if (a.status === 'absent') acc.absent++;
    if (a.status === 'late') acc.late++;
    if (a.check_in && new Date(a.check_in).getHours() <= 9) acc.onTime++;
    acc.totalHours += a.work_hours || 0;
    acc.totalOvertime += a.overtime_hours || 0;
    return acc;
  }, {
    present: 0,
    absent: 0,
    late: 0,
    onTime: 0,
    totalHours: 0,
    totalOvertime: 0
  });

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
            onClick={() => setShowHistory(true)}
            className="gap-2 transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:border-primary hover:shadow-lg hover:scale-105"
          >
            <Calendar className="h-5 w-5" />
            View History
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="shadow-elegant group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success-light rounded-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">{todayStats.present}</h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Present</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-destructive-light rounded-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-2xl font-bold text-foreground group-hover:text-destructive transition-colors duration-300">{todayStats.absent}</h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Absent</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-warning-light rounded-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <h3 className="text-2xl font-bold text-foreground group-hover:text-warning transition-colors duration-300">{todayStats.late}</h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Late</p>
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

        <Card className="shadow-elegant group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-foreground group-hover:text-blue-600 transition-colors duration-300">{todayStats.totalHours.toFixed(1)}h</h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Total Hours</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-foreground group-hover:text-purple-600 transition-colors duration-300">{todayStats.totalOvertime.toFixed(1)}h</h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Overtime</p>
          </CardContent>
        </Card>
      </div>

      {/* QR Code and Break Tracking Row */}
      {showQrCode && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-brand animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-6 w-6 text-primary" />
                QR Code Check-In/Out
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="inline-block p-8 bg-gradient-primary rounded-xl shadow-brand">
                {qrCodeData && (
                  <QRCodeSVG value={qrCodeData} size={200} level="H" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-foreground mt-6 mb-2">
                {todayAttendance && !todayAttendance.check_out
                  ? 'Check Out'
                  : 'Check In'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {todayAttendance && !todayAttendance.check_out
                  ? 'Click the button below to check out for the day'
                  : 'Click the button below to check in for the day'}
              </p>
              <div className="flex gap-3 justify-center">
                {!todayAttendance ? (
                  <Button
                    onClick={() => markAttendance(false)}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Clock className="h-4 w-4" />
                    Check In
                  </Button>
                ) : todayAttendance && !todayAttendance.check_out ? (
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

              {/* Today's Work Summary */}
              {todayAttendance && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Check In</p>
                      <p className="font-semibold">
                        {todayAttendance.check_in ?
                          new Date(todayAttendance.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                          'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Check Out</p>
                      <p className="font-semibold">
                        {todayAttendance.check_out ?
                          new Date(todayAttendance.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                          'N/A'}
                      </p>
                    </div>
                    {todayAttendance.work_hours !== null && (
                      <>
                        <div>
                          <p className="text-muted-foreground">Work Hours</p>
                          <p className="font-semibold">{todayAttendance.work_hours.toFixed(1)}h</p>
                        </div>
                        {todayAttendance.overtime_hours !== null && todayAttendance.overtime_hours > 0 && (
                          <div>
                            <p className="text-muted-foreground">Overtime</p>
                            <p className="font-semibold text-primary">+{todayAttendance.overtime_hours.toFixed(1)}h</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Break Tracking */}
          <BreakTracking
            attendanceId={todayAttendance?.id || null}
            onBreakUpdate={fetchTodayAttendance}
          />
        </div>
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
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      {employee.location && (
                        <>
                          <MapPin className="h-3 w-3" />
                          {employee.location}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {employee.check_in ? new Date(employee.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-sm font-medium text-foreground">
                      {employee.check_out ? new Date(employee.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </span>
                  </div>

                  {employee.work_hours !== null && employee.work_hours > 0 && (
                    <div className="text-center min-w-[60px]">
                      <div className="text-sm font-semibold">{employee.work_hours.toFixed(1)}h</div>
                      {employee.overtime_hours !== null && employee.overtime_hours > 0 && (
                        <div className="text-xs text-primary">+{employee.overtime_hours.toFixed(1)}h OT</div>
                      )}
                    </div>
                  )}

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

      {/* Attendance History Dialog */}
      <AttendanceHistory open={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
}
