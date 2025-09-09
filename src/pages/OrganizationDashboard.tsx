import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Users, 
  HardDrive, 
  CreditCard, 
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Calendar,
  FileText
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  subscription_plan: string;
  subscription_status: string;
  max_users: number;
  max_storage_gb: number;
  created_at: string;
}

interface Usage {
  storage_used_bytes: number;
  user_count: number;
  api_calls_count: number;
  last_updated: string;
}

export function OrganizationDashboard() {
  // Extract slug from subdomain instead of URL params
  const hostname = window.location.hostname;
  const slug = hostname.split('.')[0];
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Organization Dashboard - slug:', slug, 'user:', user);
    if (user && slug) {
      fetchOrganizationData();
    }
  }, [user, slug]);

  const fetchOrganizationData = async () => {
    if (!slug) return;
    
    setLoading(true);
    
    // Fetch organization details
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      toast({
        title: "Error",
        description: "Organization not found or access denied",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setOrganization(orgData);

    // Fetch usage data
    const { data: usageData, error: usageError } = await supabase
      .from('organization_usage')
      .select('*')
      .eq('organization_id', orgData.id)
      .single();

    if (usageError) {
      console.error('Error fetching usage:', usageError);
    } else {
      setUsage(usageData);
    }

    setLoading(false);
  };

  const formatStorageSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb < 0.1) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${gb.toFixed(2)} GB`;
  };

  const getStoragePercentage = () => {
    if (!usage || !organization) return 0;
    const usedGB = usage.storage_used_bytes / (1024 * 1024 * 1024);
    return Math.min((usedGB / organization.max_storage_gb) * 100, 100);
  };

  const getUserPercentage = () => {
    if (!usage || !organization) return 0;
    return Math.min((usage.user_count / organization.max_users) * 100, 100);
  };

  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'starter': return 'secondary';
      case 'professional': return 'default';
      case 'enterprise': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-500';
      case 'trial': return 'text-blue-500';
      case 'suspended': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading organization dashboard...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Organization Not Found</h1>
          <p className="text-muted-foreground">The organization you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-primary rounded-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{organization.name}</h1>
                <p className="text-muted-foreground">{organization.slug}.yuzen.ainrion.com</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant={getPlanColor(organization.subscription_plan)}>
                {organization.subscription_plan}
              </Badge>
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${getStatusColor(organization.subscription_status)}`} />
                <span className={`text-sm font-medium ${getStatusColor(organization.subscription_status)}`}>
                  {organization.subscription_status}
                </span>
              </div>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card hover:shadow-smooth transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage?.user_count || 0}</div>
              <p className="text-xs text-muted-foreground">
                of {organization.max_users} max users
              </p>
              <Progress value={getUserPercentage()} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-card hover:shadow-smooth transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatStorageSize(usage?.storage_used_bytes || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                of {organization.max_storage_gb}GB limit
              </p>
              <Progress value={getStoragePercentage()} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-card hover:shadow-smooth transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Calls</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usage?.api_calls_count || 0}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card hover:shadow-smooth transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Billing Status</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Active</div>
              <p className="text-xs text-muted-foreground">
                Next billing: Jan 15, 2025
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Usage Breakdown */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Usage Breakdown
              </CardTitle>
              <CardDescription>
                Monitor your organization's resource consumption
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Storage Usage</span>
                  <span className="text-sm text-muted-foreground">
                    {formatStorageSize(usage?.storage_used_bytes || 0)} / {organization.max_storage_gb}GB
                  </span>
                </div>
                <Progress value={getStoragePercentage()} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">User Slots</span>
                  <span className="text-sm text-muted-foreground">
                    {usage?.user_count || 0} / {organization.max_users} users
                  </span>
                </div>
                <Progress value={getUserPercentage()} className="h-2" />
              </div>

              <div className="pt-4 border-t">
                <Button className="w-full" variant="outline">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest actions in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-blue-100 rounded-full">
                    <Users className="h-3 w-3 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">New user joined</p>
                    <p className="text-xs text-muted-foreground">john@example.com • 2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-100 rounded-full">
                    <FileText className="h-3 w-3 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">File uploaded</p>
                    <p className="text-xs text-muted-foreground">project-docs.pdf • 5 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-purple-100 rounded-full">
                    <Settings className="h-3 w-3 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Settings updated</p>
                    <p className="text-xs text-muted-foreground">Organization settings • 1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="bg-card hover:shadow-smooth transition-all duration-200 cursor-pointer">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Manage Users</CardTitle>
              <CardDescription>
                Invite team members and manage their permissions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card hover:shadow-smooth transition-all duration-200 cursor-pointer">
            <CardHeader className="text-center">
              <HardDrive className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>File Storage</CardTitle>
              <CardDescription>
                Organize and manage your organization's files
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card hover:shadow-smooth transition-all duration-200 cursor-pointer">
            <CardHeader className="text-center">
              <CreditCard className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Billing & Plans</CardTitle>
              <CardDescription>
                Manage your subscription and billing information
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}