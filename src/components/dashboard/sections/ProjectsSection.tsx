import { useState, useEffect } from "react";
import { Plus, Search, Filter, Calendar, Users, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  team_id: string | null;
  created_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  teams?: {
    name: string;
    id: string;
  } | null;
  profiles?: {
    name: string;
  };
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function ProjectsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "active",
    priority: "medium",
    team_id: "",
    due_date: "",
  });

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchTeams();
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    setLoading(true);

    try {
      console.log('Fetching projects...');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Projects data:', data);
      console.log('Projects error:', error);

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }

      setProjects(data || []);
      console.log('Projects set successfully, count:', data?.length || 0);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      // Check if teams table exists
      const { data: tableExists } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public')
        .eq('tablename', 'teams')
        .single();

      if (!tableExists) {
        console.log('Teams table does not exist');
        setTeams([]);
        return;
      }

      const { data, error } = await supabase
        .from('teams')
        .select('id, name, description')
        .order('name');

      if (error) throw error;

      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load teams",
        variant: "destructive",
      });
    }
  };

  const createProject = async () => {
    if (!user || !newProject.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const projectData = {
        name: newProject.name.trim(),
        description: newProject.description.trim() || null,
        status: newProject.status,
        priority: newProject.priority,
        team_id: newProject.team_id || null,
        due_date: newProject.due_date ? new Date(newProject.due_date).toISOString() : null,
        created_by: user.id,
      };

      console.log('Creating project with data:', projectData);
      console.log('User ID:', user.id);

      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Project created successfully:', data);

      // Add the new project to the list
      if (data && data[0]) {
        setProjects(prev => [data[0], ...prev]);
      }

      toast({
        title: "Success",
        description: "Project created successfully",
      });

      setShowCreateDialog(false);
      setNewProject({
        name: "",
        description: "",
        status: "active",
        priority: "medium",
        team_id: "",
        due_date: "",
      });

      // Refresh the projects list
      fetchProjects();
    } catch (error: any) {
      console.error('Error creating project:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: error?.message || error?.error_description || "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'active': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'on-hold': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredProjects = projects.filter(project => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = project.name.toLowerCase().includes(searchLower) ||
                         (project.description?.toLowerCase() || '').includes(searchLower);
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your team projects</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
              variant="hero"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Project description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newProject.status} onValueChange={(value) => setNewProject({ ...newProject, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newProject.priority} onValueChange={(value) => setNewProject({ ...newProject, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="team">Team</Label>
                <Select value={newProject.team_id} onValueChange={(value) => setNewProject({ ...newProject, team_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={newProject.due_date}
                  onChange={(e) => setNewProject({ ...newProject, due_date: e.target.value })}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={createProject} className="flex-1" disabled={creating}>
                  {creating ? "Creating..." : "Create Project"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 transition-colors duration-200 group-focus-within:text-primary" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-muted-foreground/20 hover:border-muted-foreground/40 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 hover:border-primary/50 transition-colors duration-200">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground group-hover:text-primary transition-colors" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on-hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Card 
            key={project.id} 
            className="bg-card hover:shadow-smooth hover:shadow-brand/10 hover:-translate-y-1 transition-all duration-300 border border-border/50 hover:border-primary/30 group"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="group-hover:scale-110 transition-transform duration-200">
                    {getStatusIcon(project.status)}
                  </span>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors duration-200">
                    {project.name}
                  </CardTitle>
                </div>
                <Badge 
                  variant={getPriorityColor(project.priority)}
                  className="group-hover:scale-105 transition-transform duration-200"
                >
                  {project.priority}
                </Badge>
              </div>
              {project.description && (
                <CardDescription className="text-sm">
                  {project.description}
                </CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {project.teams && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                  <Users className="h-4 w-4 text-primary/80 group-hover:text-primary transition-colors" />
                  <span>{project.teams.name}</span>
                </div>
              )}
              
              {project.due_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                  <Calendar className="h-4 w-4 text-primary/80 group-hover:text-primary transition-colors" />
                  <span>Due: {new Date(project.due_date).toLocaleDateString()}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                <Avatar className="h-6 w-6 group-hover:ring-2 group-hover:ring-primary/30 transition-all duration-200">
                  <AvatarFallback className="text-xs bg-secondary group-hover:bg-secondary/80 transition-colors">
                    {project.created_by === user?.id ? 'ME' : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span>Created by {project.created_by === user?.id ? 'You' : 'User'}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-border/50 group-hover:border-primary/30 transition-colors duration-200">
                <Badge 
                  variant="outline" 
                  className="text-xs group-hover:bg-primary/5 group-hover:border-primary/30 group-hover:text-primary transition-colors duration-200"
                >
                  {project.status}
                </Badge>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No projects found.</p>
          <Button 
            className="mt-4 transition-all duration-300 hover:scale-105 hover:shadow-lg" 
            onClick={() => setShowCreateDialog(true)}
            variant="hero"
          >
            Create your first project
          </Button>
        </div>
      )}
    </div>
  );
}