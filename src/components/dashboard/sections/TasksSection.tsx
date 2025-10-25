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
  DragEndEvent,
  DragOverlay,
  useDroppable
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
      className={`p-4 rounded-lg border border-border bg-card-elevated hover:shadow-smooth transition-all duration-300 cursor-grab active:cursor-grabbing transform hover:-translate-y-0.5 ${
        isDragging ? 'shadow-lg ring-2 ring-primary/20' : 'hover:ring-1 hover:ring-primary/10'
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
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary/10 hover:text-primary"
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
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

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
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Custom Droppable component for columns
  const Droppable = ({ id, children }: { id: string; children: React.ReactNode }) => {
    const { setNodeRef } = useDroppable({ id });
    return <div ref={setNodeRef} className="h-full">{children}</div>;
  };

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
          *,\n          assignee_profile:profiles!tasks_assignee_id_fkey(id, name, user_id),\n          creator_profile:profiles!tasks_created_by_fkey(id, name, user_id)
        `)
        .order('position', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
      // console.log("Fetched tasks:", data); // Removed this line
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
      // Prepare the update data
      const updateData: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        due_date: formData.due_date || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        updated_at: new Date().toISOString()
      };

      // Handle assignee_id separately to ensure proper null handling
      if (formData.assignee_id && formData.assignee_id !== 'unassigned') {
        updateData.assignee_id = formData.assignee_id;
      } else {
        // Explicitly set to null for unassigned tasks
        updateData.assignee_id = null;
      }

      console.log('Updating task with data:', {
        ...updateData,
        assignee_id: updateData.assignee_id || 'null (unassigned)'
      });

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
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
      console.log('Form data being sent:', {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        assignee_id: formData.assignee_id === "unassigned" ? null : formData.assignee_id,
        due_date: formData.due_date || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        taskId: editingTask?.id
      });
      toast.error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditTask = (task: TaskWithProfile) => {
    console.log("handleEditTask called for task:", task); // Added console.log
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

  const handleDeleteTask = async (taskId: string) => {
    console.log("handleDeleteTask called for taskId:", taskId); // Added console.log
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

    if (!over) return;

    const activeTask = tasks.find(task => task.id === active.id);
    if (!activeTask) return;

    let newStatus = activeTask.status; // Default to current status
    let targetColumn = '';

    // Check if dropped on a column (droppable container)
    if (over.id === 'todo' || over.id === 'in-progress' || over.id === 'completed') {
      newStatus = over.id as string;
      targetColumn = over.id as string;
    } else {
      // It's over another task. Get its status.
      const overTask = tasks.find(task => task.id === over.id);
      if (overTask) {
        newStatus = overTask.status;
        targetColumn = newStatus;
      } else {
        console.warn("Dropped on an unknown target, status will not change.");
        return;
      }
    }

    // Update the task's status and position in the state
    const updatedTasks = [...tasks];
    const activeIndex = updatedTasks.findIndex(t => t.id === active.id);
    
    if (activeIndex === -1) return;

    // Remove the task from its current position
    const [movedTask] = updatedTasks.splice(activeIndex, 1);
    
    // Update the task's status
    movedTask.status = newStatus;
    
    if (activeTask.status === newStatus) {
      // Task moved within the same column, just reorder
      const statusTasks = updatedTasks.filter(task => task.status === newStatus);
      const overIndex = statusTasks.findIndex(task => task.id === over.id);
      
      if (overIndex !== -1) {
        // Insert the task at the new position
        const newPosition = overIndex >= 0 ? overIndex : statusTasks.length;
        const targetIndex = updatedTasks.findIndex(t => 
          t.status === newStatus && 
          (overIndex >= 0 ? updatedTasks.indexOf(statusTasks[overIndex]) : updatedTasks.length)
        );
        
        updatedTasks.splice(targetIndex >= 0 ? targetIndex : updatedTasks.length, 0, movedTask);
      } else {
        // If can't find the over task, just add to the end of the column
        updatedTasks.push(movedTask);
      }
    } else {
      // Task moved to a different column, add to the end of the target column
      const targetColumnTasks = updatedTasks.filter(t => t.status === newStatus);
      const insertPosition = updatedTasks.findIndex(t => t.status === newStatus && t.id === over.id);
      
      if (insertPosition !== -1) {
        updatedTasks.splice(insertPosition, 0, movedTask);
      } else {
        // If can't find the exact position, add to the end of the column
        const lastTaskInColumn = [...updatedTasks].reverse().find(t => t.status === newStatus);
        const lastIndex = lastTaskInColumn ? updatedTasks.lastIndexOf(lastTaskInColumn) : -1;
        updatedTasks.splice(lastIndex + 1, 0, movedTask);
      }
    }

    // Update the UI immediately
    setTasks(updatedTasks);

    // Update the database
    try {
      // Update the task's status and position in the database
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', active.id);

      if (error) throw error;

      // If the task was moved within the same column, update positions
      if (activeTask.status === newStatus) {
        const statusTasks = updatedTasks.filter(t => t.status === newStatus);
        await Promise.all(
          statusTasks.map((task, index) => 
            supabase
              .from('tasks')
              .update({ position: index })
              .eq('id', task.id)
          )
        );
      } else {
        // If moved to a different column, update positions for both columns
        const oldStatusTasks = updatedTasks.filter(t => t.status === activeTask.status);
        const newStatusTasks = updatedTasks.filter(t => t.status === newStatus);
        
        await Promise.all([
          ...oldStatusTasks.map((task, index) =>
            supabase
              .from('tasks')
              .update({ position: index })
              .eq('id', task.id)
          ),
          ...newStatusTasks.map((task, index) =>
            supabase
              .from('tasks')
              .update({ position: index })
              .eq('id', task.id)
          )
        ]);
      }
      
      // Refresh the tasks to ensure everything is in sync
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      fetchTasks(); // Revert on error
    }
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
    todo: tasks.filter(task => task.status.toLowerCase() === 'todo'),
    "in-progress": tasks.filter(task => task.status.toLowerCase() === 'in-progress'),
    completed: tasks.filter(task => task.status.toLowerCase() === 'completed')
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 p-1">
        <div>
          <h2 className="text-2xl font-bold text-foreground transition-all duration-200 hover:scale-105">Task Management</h2>
          <p className="text-muted-foreground">Organize and track your team's work</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex items-center rounded-lg bg-muted p-1 border border-border/50">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="transition-all duration-200 hover:scale-105 hover:bg-background/80"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Board
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="transition-all duration-200 hover:scale-105 hover:bg-background/80"
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
          <Button
            variant="hero"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="gap-2 transition-all duration-300 hover:shadow-lg hover:scale-105 group"
          >
            <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-elegant transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-accent-light rounded-lg mx-auto mb-4 group-hover:bg-accent/20 transition-colors duration-300">
              <CheckSquare className="h-6 w-6 text-accent group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">{taskStats.total}</h3>
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                {taskStats.total === 1 ? 'task' : 'tasks'} total
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success-light rounded-lg mx-auto mb-4 group-hover:bg-success/20 transition-colors duration-300">
              <CheckSquare className="h-6 w-6 text-success group-hover:scale-110 transition-transform duration-300" />
            </div>
            <h3 className="text-2xl font-bold text-foreground group-hover:text-success transition-colors duration-200">
              {taskStats.completed}
            </h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
              {taskStats.completed === 1 ? 'task' : 'tasks'} completed
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-warning-light rounded-lg mx-auto mb-4 group-hover:bg-warning/20 transition-colors duration-300">
              <Clock className="h-6 w-6 text-warning group-hover:scale-110 transition-transform duration-300" />
            </div>
            <h3 className="text-2xl font-bold text-foreground group-hover:text-warning transition-colors duration-200">
              {taskStats.inProgress}
            </h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
              {taskStats.inProgress === 1 ? 'task' : 'tasks'} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg mx-auto mb-4 group-hover:bg-primary/10 transition-colors duration-300">
              <AlertCircle className="h-6 w-6 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-300" />
            </div>
            <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-200">
              {taskStats.todo}
            </h3>
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
              {taskStats.todo === 1 ? 'task' : 'tasks'} to do
            </p>
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
                  className="p-4 rounded-lg border border-border bg-card-elevated hover:shadow-smooth hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground mb-1">{task.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {task.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs group-hover:bg-primary/5 group-hover:border-primary/30 group-hover:text-primary transition-colors duration-200">
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
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTask(task);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
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
            {['todo', 'in-progress', 'completed'].map((status) => {
              const statusTasks = tasksByStatus[status] || [];
              return (
                <Droppable key={status} id={status}>
                  <Card className="shadow-elegant hover:shadow-lg transition-shadow duration-300 border-t-4 border-primary/0 hover:border-primary/50 h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-base font-medium">
                          {status.replace("-", " ").toUpperCase()}
                        </span>
                        <Badge variant="secondary" className="text-xs group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30 transition-colors duration-200">
                          {statusTasks.length} {statusTasks.length === 1 ? 'task' : 'tasks'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SortableContext 
                        items={statusTasks.map(task => task.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3 min-h-[200px] p-1">
                          {statusTasks.length === 0 ? (
                            <div className="text-center text-muted-foreground text-sm py-8 px-4 border-2 border-dashed rounded-lg border-border/50">
                              Drop tasks here
                            </div>
                          ) : (
                            statusTasks.map((task) => (
                              <SortableTaskCard
                                key={task.id}
                                task={task}
                                onEdit={handleEditTask}
                                onDelete={handleDeleteTask}
                              />
                            ))
                          )}
                        </div>
                      </SortableContext>
                    </CardContent>
                  </Card>
                </Droppable>
              );
            })}
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
                className="transition-all duration-300 hover:bg-muted/50 hover:shadow-sm"
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
                className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                variant="hero"
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

function SortableTaskCard({ task, onEdit, onDelete }: { task: TaskWithProfile; onEdit: (task: TaskWithProfile) => void; onDelete: (taskId: string) => void; }) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group p-4 rounded-lg border border-border bg-card-elevated hover:shadow-smooth transition-all duration-300 ${
        isDragging ? 'shadow-lg ring-2 ring-primary/20' : 'hover:ring-1 hover:ring-primary/10'
      }`}
    >
      {/* Header row: left side is the drag handle, right side has badges and actions (not draggable) */}
      <div className="flex items-start justify-between mb-3">
        {/* Drag handle - attach listeners only here */}
        <div className="flex-1 min-w-0 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
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
          <Badge className={getStatusColor(task.status)}>
            {task.status.replace("-", " ").toUpperCase()}
          </Badge>
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority.toUpperCase()}
          </Badge>
          {/* Edit and Delete buttons are now outside the drag handle */}
          <div className="flex gap-1 mt-2" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary/10 hover:text-primary"
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
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {task.assignee_profile && (
        <div className="flex items-center text-sm text-muted-foreground mt-2">
          <User className="h-4 w-4 mr-1" />
          <span>{task.assignee_profile.name || 'Unassigned'}</span>
        </div>
      )}
      {task.due_date && (
        <div className="flex items-center text-sm text-muted-foreground mt-1">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{new Date(task.due_date).toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}