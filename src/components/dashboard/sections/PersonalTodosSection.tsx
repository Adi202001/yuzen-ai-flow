import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Plus, 
  Search,
  Circle,
  CheckCircle2,
  Clock,
  Edit3,
  Trash2
} from "lucide-react";

const personalTodos = [
  {
    id: 1,
    title: "Review quarterly performance",
    content: "Analyze team performance data and prepare summary report for the leadership meeting next week.",
    completed: false,
    createdAt: "2024-01-10",
    updatedAt: "2024-01-12"
  },
  {
    id: 2,
    title: "Schedule team one-on-ones",
    content: "Book individual meetings with each team member for next week. Focus on career development and current project feedback.",
    completed: false,
    createdAt: "2024-01-08",
    updatedAt: "2024-01-11"
  },
  {
    id: 3,
    title: "Complete expense reports",
    content: "Submit travel and office supply expenses for December. Include receipts for hotel stays and team dinner.",
    completed: true,
    createdAt: "2024-01-05",
    updatedAt: "2024-01-10"
  },
  {
    id: 4,
    title: "Plan project roadmap",
    content: "Outline milestones and deliverables for Q2 projects. Need to coordinate with product and design teams.",
    completed: false,
    createdAt: "2024-01-09",
    updatedAt: "2024-01-12"
  },
  {
    id: 5,
    title: "Update LinkedIn profile",
    content: "Add recent achievements and skills to professional profile. Include new certifications and project highlights.",
    completed: false,
    createdAt: "2024-01-07",
    updatedAt: "2024-01-08"
  },
  {
    id: 6,
    title: "Grocery shopping",
    content: "Pick up ingredients for weekend meal prep - salmon, vegetables, quinoa, and fruits.",
    completed: false,
    createdAt: "2024-01-12",
    updatedAt: "2024-01-12"
  }
];

export function PersonalTodosSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoContent, setNewTodoContent] = useState("");

  const filteredTodos = personalTodos.filter(todo => 
    todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    todo.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTodo = () => {
    if (newTodoTitle.trim()) {
      // In a real app, this would create the todo
      setNewTodoTitle("");
      setNewTodoContent("");
      setShowCreateDialog(false);
    }
  };

  const toggleTodoComplete = (id: number) => {
    // In a real app, this would update the todo status
    console.log(`Toggle todo ${id}`);
  };



  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Notes</h1>
          <p className="text-muted-foreground text-sm">{filteredTodos.length} notes</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-warning hover:bg-warning/90 text-warning-foreground rounded-full px-6 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 border-0 bg-background/50 rounded-lg text-sm"
        />
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTodos.map((todo) => (
          <div
            key={todo.id}
            className="bg-background rounded-lg p-4 border border-border/50 hover:border-border transition-colors cursor-pointer group"
            onClick={() => toggleTodoComplete(todo.id)}
          >
            <div className="flex items-start gap-3 mb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTodoComplete(todo.id);
                }}
                className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {todo.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium text-sm mb-2 line-clamp-2 ${
                  todo.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                }`}>
                  {todo.title}
                </h3>
              </div>
            </div>
            
            <p className={`text-xs leading-relaxed line-clamp-4 mb-3 ${
              todo.completed ? 'text-muted-foreground/70' : 'text-muted-foreground'
            }`}>
              {todo.content}
            </p>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground/60">
              <span>{new Date(todo.updatedAt).toLocaleDateString()}</span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Edit functionality
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Delete functionality
                  }}
                  className="p-1 hover:bg-muted rounded text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTodos.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Edit3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No notes yet</h3>
          <p className="text-muted-foreground mb-4">Create your first note to get started</p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-warning hover:bg-warning/90 text-warning-foreground rounded-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      )}

      {/* Create Note Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Note title..."
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                className="border-0 text-lg font-medium placeholder:text-muted-foreground focus-visible:ring-0 px-0"
              />
            </div>
            <div>
              <Textarea
                placeholder="Start writing..."
                value={newTodoContent}
                onChange={(e) => setNewTodoContent(e.target.value)}
                className="border-0 resize-none min-h-[200px] placeholder:text-muted-foreground focus-visible:ring-0 px-0"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewTodoTitle("");
                  setNewTodoContent("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTodo}
                className="bg-warning hover:bg-warning/90 text-warning-foreground"
                disabled={!newTodoTitle.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}