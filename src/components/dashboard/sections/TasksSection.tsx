import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Filter, 
  Calendar,
  User,
  CheckSquare,
  Clock,
  AlertCircle,
  LayoutGrid,
  List,
  Edit,
  Trash2
} from "lucide-react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  tags: string[] | null;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  name: string | null;
  user_id: string;
}

interface TaskWithProfile extends Task {
  assignee_profile?: Profile;
  creator_profile?: Profile;
}

// Sortable task item component
function SortableTaskItem({ task, onEdit, onDelete }: { 
  task: TaskWithProfile; 
  onEdit: (task: TaskWithProfile) => void;
  onDelete: (taskId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-warning text-warning-foreground";
      case "medium":
        return "bg-accent text-accent-foreground";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-4 rounded-lg border border-border bg-card-elevated hover:shadow-smooth transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground mb-1 truncate">{task.title}</h4>
          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{task.description}</p>
          <div className="flex flex-wrap items-center gap-2">
            {task.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 ml-2">
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority.toUpperCase()}
          </Badge>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{task.assignee_profile?.name || 'Unassigned'}</span>
          </div>
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {new Date(task.due_date).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1 ml-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TasksSection() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithProfile[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithProfile | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
      assignee_id: "unassigned",
    due_date: "",
    tags: [] as string[]
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchProfiles();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee_profile:profiles!tasks_assignee_id_fkey(id, name, user_id),
          creator_profile:profiles!tasks_created_by_fkey(id, name, user_id)
        `)
        .order('position', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!formData.title.trim() || !user) return;

    try {
      const maxPosition = Math.max(...tasks.map(t => t.position), -1);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          assignee_id: formData.assignee_id === "unassigned" ? null : formData.assignee_id,
          due_date: formData.due_date || null,
          tags: formData.tags.length > 0 ? formData.tags : null,
          position: maxPosition + 1,
          created_by: user.id
        })
        .select(`
          *,
          assignee_profile:profiles!tasks_assignee_id_fkey(id, name, user_id),
          creator_profile:profiles!tasks_created_by_fkey(id, name, user_id)
        `)
        .single();

      if (error) throw error;

      setTasks([...tasks, data]);
      resetForm();
      setShowCreateDialog(false);
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !formData.title.trim()) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          priority: formData.priority,
          assignee_id: formData.assignee_id === "unassigned" ? null : formData.assignee_id,
          due_date: formData.due_date || null,
          tags: formData.tags.length > 0 ? formData.tags : null
        })
        .eq('id', editingTask.id)
        .select(`
          *,
          assignee_profile:profiles!tasks_assignee_id_fkey(id, name, user_id),
          creator_profile:profiles!tasks_created_by_fkey(id, name, user_id)
        `)
        .single();

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === editingTask.id ? data : task
      ));
      resetForm();
      setShowEditDialog(false);
      setEditingTask(null);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeTask = tasks.find(task => task.id === active.id);
    const overTask = tasks.find(task => task.id === over.id);

    if (!activeTask || !overTask) return;

    const newStatus = overTask.status;
    const statusTasks = tasks.filter(task => task.status === newStatus);
    const activeIndex = statusTasks.findIndex(task => task.id === active.id);
    const overIndex = statusTasks.findIndex(task => task.id === over.id);

    if (activeIndex !== -1 && overIndex !== -1) {
      // Same status, just reorder
      const newOrder = arrayMove(statusTasks, activeIndex, overIndex);
      const updatedTasks = tasks.map(task => {
        if (task.status === newStatus) {
          const newIndex = newOrder.findIndex(t => t.id === task.id);
          return { ...task, position: newIndex };
        }
        return task;
      });
      setTasks(updatedTasks);
    } else {
      // Different status, move task
      const updatedTasks = tasks.map(task => {
        if (task.id === active.id) {
          return { ...task, status: newStatus };
        }
        return task;
      });
      setTasks(updatedTasks);
    }

    // Update database
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          position: overTask.position
        })
        .eq('id', String(active.id));

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task position:', error);
      toast.error('Failed to update task position');
      // Revert on error
      fetchTasks();
    }
  };

  const handleEditTask = (task: TaskWithProfile) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      assignee_id: task.assignee_id || "unassigned",
      due_date: task.due_date ? task.due_date.split('T')[0] : "",
      tags: task.tags || []
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      assignee_id: "unassigned",
      due_date: "",
      tags: []
    });
    setEditingTask(null);
  };

  const filteredTasks = selectedFilter === "all" 
    ? tasks 
    : tasks.filter(task => task.status === selectedFilter);

  const tasksByStatus = {
    todo: tasks.filter(task => task.status === 'todo'),
    "in-progress": tasks.filter(task => task.status === 'in-progress'),
    completed: tasks.filter(task => task.status === 'completed')
  };

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "completed").length,
    inProgress: tasks.filter(t => t.status === "in-progress").length,
    todo: tasks.filter(t => t.status === "todo").length
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-warning text-warning-foreground";
      case "medium":
        return "bg-accent text-accent-foreground";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground";
      case "in-progress":
        return "bg-accent text-accent-foreground";
      case "todo":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Task Management</h1>
          <p className="text-muted-foreground">Organize and track project tasks with your team</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="hero" className="gap-2" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-5 w-5" />
            Create Task
          </Button>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-accent-light rounded-lg mx-auto mb-4">
              <CheckSquare className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{taskStats.total}</h3>
            <p className="text-sm text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success-light rounded-lg mx-auto mb-4">
              <CheckSquare className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{taskStats.completed}</h3>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-warning-light rounded-lg mx-auto mb-4">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{taskStats.inProgress}</h3>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{taskStats.todo}</h3>
            <p className="text-sm text-muted-foreground">To Do</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {viewMode === "list" ? (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-primary" />
              Tasks ({filteredTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-lg border border-border bg-card-elevated hover:shadow-smooth transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">{task.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {task.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace("-", " ").toUpperCase()}
                      </Badge>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{task.assignee_profile?.name || 'Unassigned'}</span>
                      </div>
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditTask(task)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
              <Card key={status} className="shadow-elegant">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-base font-medium">
                      {status.replace("-", " ").toUpperCase()}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {statusTasks.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SortableContext 
                    items={statusTasks.map(task => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3 min-h-[200px]">
                      {statusTasks.map((task) => (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            ))}
          </div>
        </DndContext>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Task Title
              </label>
              <Input 
                placeholder="Enter task title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Description
              </label>
              <Textarea 
                placeholder="Task description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Priority
                </label>
                <Select 
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Assignee
                </label>
                <Select 
                  value={formData.assignee_id}
                  onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.user_id}>
                        {profile.name || 'Unnamed User'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Due Date
              </label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTask}
                disabled={!formData.title.trim()}
              >
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Task Title
              </label>
              <Input 
                placeholder="Enter task title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Description
              </label>
              <Textarea 
                placeholder="Task description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Priority
                </label>
                <Select 
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Assignee
                </label>
                <Select 
                  value={formData.assignee_id}
                  onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.user_id}>
                        {profile.name || 'Unnamed User'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Due Date
              </label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateTask}
                disabled={!formData.title.trim()}
              >
                Update Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}