import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function SimpleProjectForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a project",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('=== Starting project creation ===');
      console.log('User:', user);
      console.log('User ID:', user.id);
      console.log('Form data:', formData);

      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: 'active',
        priority: 'medium',
        team_id: null,
        due_date: null,
        created_by: user.id,
      };

      console.log('Project data to insert:', projectData);

      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select();

      console.log('Supabase response - data:', data);
      console.log('Supabase response - error:', error);

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      console.log('Project created successfully!', data);

      toast({
        title: "Success!",
        description: "Project created successfully",
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
      });

    } catch (error: any) {
      console.error('=== Project creation error ===');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error details:', error?.details);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      toast({
        title: "Error",
        description: error?.message || "Failed to create project. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-card rounded-lg border">
      <h2 className="text-2xl font-bold mb-4">Create Project (Debug Mode)</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter project name"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter project description"
            rows={3}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Project"}
        </Button>

        <div className="text-sm text-muted-foreground mt-4">
          <p>User ID: {user?.id || 'Not logged in'}</p>
          <p>Check browser console (F12) for detailed logs</p>
        </div>
      </form>
    </div>
  );
}
