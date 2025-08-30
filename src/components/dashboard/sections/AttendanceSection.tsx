import { useState } from "react";
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

const attendanceData = [
  {
    id: 1,
    name: "Sarah Wilson",
    email: "sarah@company.com",
    status: "present",
    checkIn: "09:15 AM",
    checkOut: null,
    location: "Office"
  },
  {
    id: 2,
    name: "Mike Johnson", 
    email: "mike@company.com",
    status: "present",
    checkIn: "08:45 AM",
    checkOut: null,
    location: "Remote"
  },
  {
    id: 3,
    name: "Alex Chen",
    email: "alex@company.com", 
    status: "present",
    checkIn: "09:30 AM",
    checkOut: null,
    location: "Office"
  },
  {
    id: 4,
    name: "Emma Davis",
    email: "emma@company.com",
    status: "absent",
    checkIn: null,
    checkOut: null,
    location: null
  },
  {
    id: 5,
    name: "John Smith",
    email: "john@company.com",
    status: "late", 
    checkIn: "10:15 AM",
    checkOut: null,
    location: "Office"
  }
];

const todayStats = {
  present: 4,
  absent: 1,
  late: 1,
  onTime: 3
};

export function AttendanceSection() {
  const [showQrCode, setShowQrCode] = useState(false);

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
                <div className="text-6xl">📱</div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mt-6 mb-2">Scan to Check In</h3>
            <p className="text-muted-foreground mb-4">
              Use your mobile device to scan this QR code for quick attendance marking
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span>Mobile app required for scanning</span>
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
                className="flex items-center justify-between p-4 rounded-lg bg-card-elevated hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                    {employee.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{employee.name}</h4>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
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
                    {employee.checkIn && (
                      <p className="text-sm font-medium text-foreground">
                        In: {employee.checkIn}
                      </p>
                    )}
                    {employee.checkOut && (
                      <p className="text-sm text-muted-foreground">
                        Out: {employee.checkOut}
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