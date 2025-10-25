import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Check, X, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason?: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  user_name?: string;
  approver_name?: string;
}

const leaveTypes = [
  'Annual Leave',
  'Sick Leave',
  'Emergency Leave',
  'Maternity/Paternity Leave',
  'Study Leave',
  'Other'
];

const statusColors = {
  pending: 'bg-warning text-warning-foreground',
  approved: 'bg-success text-success-foreground',
  rejected: 'bg-destructive text-destructive-foreground'
};

export function LeaveRequestsSection() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  
  const { user, profile } = useAuth();
  const isHROrAdmin = profile?.role === 'hr' || profile?.role === 'admin';

  useEffect(() => {
    if (user) {
      fetchLeaveRequests();
    }
  }, [user, isHROrAdmin]);

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription
    const subscription = supabase
      .channel('leave_requests')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests' },
        () => fetchLeaveRequests()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchLeaveRequests = async () => {
    if (!user) return;

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        user:profiles!leave_requests_user_id_fkey(name),
        approver:profiles!leave_requests_approved_by_fkey(name)
      `);

    // If not HR/Admin, only show own requests
    if (!isHROrAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leave requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leave requests",
        variant: "destructive",
      });
      return;
    }

    const formattedRequests = data.map(request => ({
      ...request,
      user_name: request.user?.name,
      approver_name: request.approver?.name
    }));

    setLeaveRequests(formattedRequests);
    setLoading(false);
  };

  const submitRequest = async () => {
    if (!user || !startDate || !endDate || !leaveType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('leave_requests')
      .insert([
        {
          user_id: user.id,
          start_date: startDate,
          end_date: endDate,
          leave_type: leaveType,
          reason: reason || null,
        }
      ]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit leave request",
        variant: "destructive",
      });
      return;
    }

    // Reset form
    setStartDate('');
    setEndDate('');
    setLeaveType('');
    setReason('');
    setShowNewRequest(false);

    toast({
      title: "Success",
      description: "Leave request submitted successfully",
    });
  };

  const updateRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!user || !isHROrAdmin) return;

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      toast({
        title: "Error",
        description: `Failed to ${status} leave request`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Leave request ${status} successfully`,
    });
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Leave Requests</h1>
          <p className="text-muted-foreground mt-2">
            {isHROrAdmin ? 'Manage all leave requests' : 'Manage your leave requests'}
          </p>
        </div>
        
        <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
          <DialogTrigger asChild>
            <Button 
              className="transition-all duration-300 hover:shadow-lg hover:scale-105"
              variant="hero"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div className="text-sm text-muted-foreground">
                  Duration: {calculateDays(startDate, endDate)} day(s)
                </div>
              )}

              <div>
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide additional details..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={submitRequest} 
                className="w-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                disabled={!startDate || !endDate || !leaveType}
              >
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Pending</p>
                <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {leaveRequests.filter(req => req.status === 'pending').length}
                </p>
              </div>
              <div className="p-2 bg-warning/10 rounded-lg group-hover:bg-warning/20 transition-colors">
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Approved</p>
                <p className="text-2xl font-bold text-foreground group-hover:text-success transition-colors">
                  {leaveRequests.filter(req => req.status === 'approved').length}
                </p>
              </div>
              <div className="p-2 bg-success/10 rounded-lg group-hover:bg-success/20 transition-colors">
                <Check className="h-8 w-8 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-brand transition-all duration-300 hover:-translate-y-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Rejected</p>
                <p className="text-2xl font-bold text-foreground group-hover:text-destructive transition-colors">
                  {leaveRequests.filter(req => req.status === 'rejected').length}
                </p>
              </div>
              <div className="p-2 bg-destructive/10 rounded-lg group-hover:bg-destructive/20 transition-colors">
                <X className="h-8 w-8 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests List */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="w-5 h-5 text-primary" />
            {isHROrAdmin ? 'All Leave Requests' : 'Your Leave Requests'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No leave requests found</p>
              <p className="text-muted-foreground">
                {isHROrAdmin 
                  ? 'When employees submit leave requests, they will appear here' 
                  : 'Click "New Request" to submit a leave request'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaveRequests.map(request => (
                <div
                  key={request.id}
                  className="group flex items-center justify-between p-4 border rounded-lg hover:shadow-smooth transition-all duration-300 hover:border-primary/30 hover:-translate-y-0.5"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      {isHROrAdmin && (
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {request.user_name}
                        </span>
                      )}
                      <Badge 
                        variant="outline" 
                        className="border-primary/20 group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors"
                      >
                        {request.leave_type}
                      </Badge>
                      <Badge 
                        className={`${statusColors[request.status as keyof typeof statusColors]} group-hover:opacity-90 transition-opacity`}
                      >
                        {request.status}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1 group-hover:text-foreground/80 transition-colors">
                      <p className="flex flex-wrap items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        <span className="font-medium">Dates:</span> 
                        {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        <span className="ml-1 text-muted-foreground/80">
                          ({calculateDays(request.start_date, request.end_date)} {calculateDays(request.start_date, request.end_date) === 1 ? 'day' : 'days'})
                        </span>
                      </p>
                      {request.reason && (
                        <p className="truncate max-w-[90%]">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Submitted:</span> {new Date(request.created_at).toLocaleDateString()}
                      </p>
                      {request.approved_at && request.approver_name && (
                        <p>
                          <span className="font-medium">
                            {request.status === 'approved' ? 'Approved' : 'Rejected'} by:
                          </span>{' '}
                          {request.approver_name} on {new Date(request.approved_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons for HR/Admin */}
                  {isHROrAdmin && request.status === 'pending' && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateRequestStatus(request.id, 'approved');
                        }}
                        className="text-success hover:bg-success/10 hover:border-success/30 hover:shadow-sm transition-all duration-200"
                      >
                        <Check className="w-4 h-4" />
                        <span className="sr-only">Approve</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateRequestStatus(request.id, 'rejected');
                        }}
                        className="text-destructive hover:bg-destructive/10 hover:border-destructive/30 hover:shadow-sm transition-all duration-200"
                      >
                        <X className="w-4 h-4" />
                        <span className="sr-only">Reject</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}