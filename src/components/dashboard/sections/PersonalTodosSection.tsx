import { useState } from "react";
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
  DialogTrigger,
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
  CheckSquare,
  Clock,
  AlertCircle,
  LayoutGrid,
  List,
  MoreHorizontal
} from "lucide-react";

const personalTodos = [
  {
    id: 1,
    title: "Review quarterly performance metrics",
    description: "Analyze team performance data and prepare summary report",
    priority: "high",
    status: "todo",
    dueDate: "2024-01-15",
    tags: ["review", "performance"]
  },
  {
    id: 2,
    title: "Schedule team one-on-ones",
    description: "Book individual meetings with each team member for next week",
    priority: "medium",
    status: "in-progress",
    dueDate: "2024-01-12",
    tags: ["meetings", "team"]
  },
  {
    id: 3,
    title: "Complete expense reports",
    description: "Submit travel and office supply expenses for December",
    priority: "medium",
    status: "completed",
    dueDate: "2024-01-10",
    tags: ["finance", "administrative"]
  },
  {
    id: 4,
    title: "Plan project roadmap",
    description: "Outline milestones and deliverables for Q2 projects",
    priority: "high",
    status: "todo",
    dueDate: "2024-01-20",
    tags: ["planning", "strategy"]
  },
  {
    id: 5,
    title: "Update LinkedIn profile",
    description: "Add recent achievements and skills to professional profile",
    priority: "low",
    status: "todo",
    dueDate: "2024-01-25",
    tags: ["professional", "networking"]
  }
];

const todoStats = {
  total: personalTodos.length,
  completed: personalTodos.filter(t => t.status === "completed").length,
  inProgress: personalTodos.filter(t => t.status === "in-progress").length,
  todo: personalTodos.filter(t => t.status === "todo").length
};

export function PersonalTodosSection() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

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

  const filteredTodos = selectedFilter === "all" 
    ? personalTodos 
    : personalTodos.filter(todo => todo.status === selectedFilter);

  const todosByStatus = {
    todo: personalTodos.filter(todo => todo.status === "todo"),
    "in-progress": personalTodos.filter(todo => todo.status === "in-progress"),
    completed: personalTodos.filter(todo => todo.status === "completed")
  };

  const renderTodoCard = (todo: any, showStatus = true) => (
    <div
      key={todo.id}
      className="p-4 rounded-lg border border-border bg-card-elevated hover:shadow-smooth transition-all duration-200 mb-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground mb-1">{todo.title}</h4>
          <p className="text-sm text-muted-foreground mb-3">{todo.description}</p>
          <div className="flex flex-wrap items-center gap-2">
            {todo.tags.map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {showStatus && (
            <Badge className={getStatusColor(todo.status)}>
              {todo.status.replace("-", " ").toUpperCase()}
            </Badge>
          )}
          <Badge className={getPriorityColor(todo.priority)}>
            {todo.priority.toUpperCase()}
          </Badge>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          <span>Due: {new Date(todo.dueDate).toLocaleDateString()}</span>
        </div>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderListView = () => (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-primary" />
          Personal Todos ({filteredTodos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredTodos.map((todo) => renderTodoCard(todo))}
        </div>
      </CardContent>
    </Card>
  );

  const renderKanbanView = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Object.entries(todosByStatus).map(([status, todos]) => (
        <Card key={status} className="shadow-elegant">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="text-base font-medium">
                {status.replace("-", " ").toUpperCase()}
              </span>
              <Badge variant="secondary" className="text-xs">
                {todos.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todos.map((todo) => renderTodoCard(todo, false))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Personal Todos</h1>
          <p className="text-muted-foreground">Manage your personal tasks and goals</p>
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
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2">
                <Plus className="h-5 w-5" />
                Add Todo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Personal Todo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Todo Title
                  </label>
                  <Input placeholder="Enter todo title..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Description
                  </label>
                  <Textarea placeholder="Todo description..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Priority
                    </label>
                    <Select>
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
                      Due Date
                    </label>
                    <Input type="date" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setShowCreateDialog(false)}>
                    Create Todo
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Todos</SelectItem>
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
            <h3 className="text-2xl font-bold text-foreground">{todoStats.total}</h3>
            <p className="text-sm text-muted-foreground">Total Todos</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success-light rounded-lg mx-auto mb-4">
              <CheckSquare className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{todoStats.completed}</h3>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-warning-light rounded-lg mx-auto mb-4">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{todoStats.inProgress}</h3>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{todoStats.todo}</h3>
            <p className="text-sm text-muted-foreground">To Do</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {viewMode === "list" ? renderListView() : renderKanbanView()}
    </div>
  );
}