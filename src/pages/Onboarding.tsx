import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowRight } from "lucide-react";

export function Onboarding() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: ""
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Auto-generate slug from name
      ...(field === 'name' && { slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Validate slug format
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(formData.slug)) {
        toast({
          title: "Invalid slug",
          description: "Slug can only contain lowercase letters, numbers, and hyphens",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if slug is already taken
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', formData.slug)
        .single();

      if (existingOrg) {
        toast({
          title: "Slug already taken",
          description: "Please choose a different organization slug",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Create organization
      const { error } = await supabase
        .from('organizations')
        .insert([
          {
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            owner_id: user.id
          }
        ]);

      if (error) {
        throw error;
      }

      toast({
        title: "Organization created!",
        description: `Welcome to ${formData.name}! Redirecting to your dashboard...`,
      });

      // Redirect to the organization subdomain
      const currentDomain = window.location.hostname.includes('lovable') 
        ? window.location.hostname 
        : 'yuzen.ainrion.com';
      const newUrl = `${window.location.protocol}//${formData.slug}.${currentDomain}`;
      window.location.href = newUrl;

    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="p-3 bg-gradient-primary rounded-lg w-fit mx-auto mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Create Your Organization</CardTitle>
          <CardDescription>
            Let's set up your workspace to get started with Yuzen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                placeholder="My Company"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Subdomain Slug</Label>
              <div className="flex">
                <Input
                  id="slug"
                  placeholder="my-company"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  required
                />
                <span className="flex items-center px-3 text-sm text-muted-foreground bg-muted border border-l-0 rounded-r-md">
                  .yuzen.ainrion.com
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                This will be your organization's unique URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Tell us about your organization..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !formData.name || !formData.slug}
            >
              {loading ? (
                "Creating..."
              ) : (
                <>
                  Create Organization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}