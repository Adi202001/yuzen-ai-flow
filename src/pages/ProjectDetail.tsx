import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Kanban, Calendar, MessageSquare, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProjectKanban } from "@/components/project/ProjectKanban";
import { ProjectTimeline } from "@/components/project/ProjectTimeline";
import { ProjectDiscussions } from "@/components/project/ProjectDiscussions";
import { ProjectDocuments } from "@/components/project/ProjectDocuments";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  created_by: string;
  created_at: string;
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId && user) {
      fetchProject();
    }
  }, [projectId, user]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      setProject(data);
    } catch (error: any) {
      console.error('Error fetching project:', error);
      toast({
        title: "Error",
        description: "Failed to load project",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-lg">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg mb-4">Project not found</p>
          <Button onClick={() => navigate('/')}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>

          <div className="bg-card rounded-lg border p-6">
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
            <div className="flex gap-2 mt-4">
              <span className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary">
                {project.status}
              </span>
              <span className="px-3 py-1 rounded-full text-xs bg-secondary">
                {project.priority}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <Kanban className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="discussions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Discussions
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban">
            <ProjectKanban projectId={project.id} />
          </TabsContent>

          <TabsContent value="timeline">
            <ProjectTimeline projectId={project.id} />
          </TabsContent>

          <TabsContent value="discussions">
            <ProjectDiscussions projectId={project.id} />
          </TabsContent>

          <TabsContent value="documents">
            <ProjectDocuments projectId={project.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
