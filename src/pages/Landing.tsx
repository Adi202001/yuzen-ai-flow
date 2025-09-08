import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Users, 
  HardDrive, 
  CreditCard, 
  CheckCircle, 
  Plus,
  ArrowRight,
  Zap,
  Shield,
  Globe
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  subscription_plan: string;
  created_at: string;
}

export function Landing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: "",
    slug: "",
    description: "",
  });

  useEffect(() => {
    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  const fetchOrganizations = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching organizations:', error);
      return;
    }

    setOrganizations(data || []);
    setLoading(false);
  };

  const createOrganization = async () => {
    if (!user || !newOrg.name.trim() || !newOrg.slug.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(newOrg.slug)) {
      toast({
        title: "Error",
        description: "Slug can only contain lowercase letters, numbers, and hyphens",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('organizations')
      .insert([{
        ...newOrg,
        owner_id: user.id,
      }]);

    if (error) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: error.message.includes('duplicate') 
          ? "This slug is already taken. Please choose another one."
          : "Failed to create organization",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Success",
      description: "Organization created successfully!",
    });

    setShowCreateDialog(false);
    setNewOrg({ name: "", slug: "", description: "" });
    fetchOrganizations();
    setLoading(false);
  };

  const handleSlugChange = (value: string) => {
    // Auto-generate slug from name if user is typing in name field
    const formattedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 30);
    setNewOrg({ ...newOrg, slug: formattedSlug });
  };

  const handleNameChange = (value: string) => {
    setNewOrg({ ...newOrg, name: value });
    // Auto-generate slug if slug is empty or matches previous name
    if (!newOrg.slug || newOrg.slug === newOrg.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')) {
      handleSlugChange(value);
    }
  };

  const goToOrganization = (slug: string) => {
    // In a real implementation, this would navigate to the subdomain
    window.open(`https://${slug}.yuzen.ainrion.com`, '_blank');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-surface">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
            <div className="space-y-8">
              <Badge variant="secondary" className="mx-auto w-fit">
                <Zap className="h-4 w-4 mr-2" />
                Multi-tenant SaaS Platform
              </Badge>
              
              <h1 className="text-5xl md:text-7xl font-bold text-gradient-primary">
                Yuzen
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Create and manage your organization with powerful tools for team collaboration, 
                project management, and business growth.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 px-8 py-3 text-lg">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20 bg-card/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful features to help your organization succeed
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-card border-border hover:shadow-smooth transition-all duration-200">
                <CardHeader>
                  <Globe className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Custom Subdomains</CardTitle>
                  <CardDescription>
                    Get your own branded subdomain like yourcompany.yuzen.ainrion.com
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="bg-card border-border hover:shadow-smooth transition-all duration-200">
                <CardHeader>
                  <Users className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Team Management</CardTitle>
                  <CardDescription>
                    Invite team members, manage roles, and collaborate effectively
                  </CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="bg-card border-border hover:shadow-smooth transition-all duration-200">
                <CardHeader>
                  <Shield className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Enterprise Security</CardTitle>
                  <CardDescription>
                    Bank-level security with data encryption and compliance
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of organizations already using Yuzen to streamline their operations.
            </p>
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 px-8 py-3 text-lg">
              Create Your Organization
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold text-gradient-primary mb-2">Welcome to Yuzen</h1>
            <p className="text-lg text-muted-foreground">
              Manage your organizations and access your dashboards
            </p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    value={newOrg.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Acme Corporation"
                  />
                </div>
                
                <div>
                  <Label htmlFor="slug">Subdomain Slug *</Label>
                  <div className="flex items-center">
                    <Input
                      id="slug"
                      value={newOrg.slug}
                      onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value })}
                      placeholder="acme"
                      className="rounded-r-none"
                    />
                    <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-sm text-muted-foreground">
                      .yuzen.ainrion.com
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only lowercase letters, numbers, and hyphens allowed
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newOrg.description}
                    onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
                    placeholder="Brief description of your organization"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={createOrganization} disabled={loading} className="flex-1">
                    {loading ? "Creating..." : "Create Organization"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Organizations Grid */}
        {loading && organizations.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading organizations...</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h3 className="text-2xl font-semibold mb-3">No Organizations Yet</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your first organization to get started with managing your teams and projects.
            </p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Organization
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <Card key={org.id} className="bg-card hover:shadow-smooth transition-all duration-200 cursor-pointer group"
                    onClick={() => goToOrganization(org.slug)}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-primary rounded-lg">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {org.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {org.slug}.yuzen.ainrion.com
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {org.subscription_plan}
                    </Badge>
                  </div>
                  {org.description && (
                    <CardDescription className="text-sm mt-2">
                      {org.description}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">5</span>
                      <span className="text-xs text-muted-foreground">Users</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">1GB</span>
                      <span className="text-xs text-muted-foreground">Storage</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Active</span>
                      <span className="text-xs text-muted-foreground">Status</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(org.created_at).toLocaleDateString()}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}