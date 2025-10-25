import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  Users, 
  MessageSquare, 
  Calendar, 
  CheckSquare, 
  Database,
  Activity,
  Shield,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SystemStats {
  totalUsers: number;
  totalMessages: number;
  totalTasks: number;
  totalLeaveRequests: number;
  pendingLeaveRequests: number;
  completedTasks: number;
}

export function AdminSection() {
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalMessages: 0,
    totalTasks: 0,
    totalLeaveRequests: 0,
    pendingLeaveRequests: 0,
    completedTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchSystemStats();
    }
  }, [profile]);

  const fetchSystemStats = async () => {
    try {
      // Fetch various statistics in parallel
      const [
        usersData,
        messagesData,
        tasksData,
        leaveRequestsData,
        pendingLeaveData,
        completedTasksData
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }),
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'done')
      ]);

      setStats({
        totalUsers: usersData.count || 0,
        totalMessages: messagesData.count || 0,
        totalTasks: tasksData.count || 0,
        totalLeaveRequests: leaveRequestsData.count || 0,
        pendingLeaveRequests: pendingLeaveData.count || 0,
        completedTasks: completedTasksData.count || 0,
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can access this section.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient-primary">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          System overview and administration tools
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.totalTasks}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leave Requests</p>
                <p className="text-2xl font-bold">{stats.totalLeaveRequests}</p>
              </div>
              <Calendar className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completed Tasks</span>
              <Badge variant="outline">{stats.completedTasks}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Task Completion Rate</span>
              <Badge variant="outline">
                {stats.totalTasks > 0 ? 
                  `${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%` : 
                  '0%'
                }
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Pending Leave Requests</span>
              <Badge variant={stats.pendingLeaveRequests > 0 ? "destructive" : "outline"}>
                {stats.pendingLeaveRequests}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Database className="w-4 h-4 mr-2" />
              Database Management
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Shield className="w-4 h-4 mr-2" />
              Security Settings
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              System Configuration
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Activity className="w-4 h-4 mr-2" />
              View System Logs
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts & Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.pendingLeaveRequests > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-medium">Pending Leave Requests</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.pendingLeaveRequests} leave request(s) awaiting approval
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No system alerts at this time</p>
              <p className="text-sm">All systems are running normally</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">User Management</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Registered Users:</span>
                  <span className="font-medium">{stats.totalUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Sessions:</span>
                  <span className="font-medium">-</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Communication</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Messages:</span>
                  <span className="font-medium">{stats.totalMessages}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Conversations:</span>
                  <span className="font-medium">-</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}