import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PersonalTodo {
  id: string;
  title: string;
  content: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function PersonalTodosSection() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<PersonalTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTodo, setEditingTodo] = useState<PersonalTodo | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoContent, setNewTodoContent] = useState("");

  useEffect(() => {
    if (user) {
      fetchTodos();
    }
  }, [user]);

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from('personal_todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const filteredTodos = todos.filter(todo => 
    todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (todo.content && todo.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateTodo = async () => {
    if (!newTodoTitle.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('personal_todos')
        .insert({
          title: newTodoTitle.trim(),
          content: newTodoContent.trim() || null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setTodos([data, ...todos]);
      setNewTodoTitle("");
      setNewTodoContent("");
      setShowCreateDialog(false);
      toast.success('Note created successfully');
    } catch (error) {
      console.error('Error creating todo:', error);
      toast.error('Failed to create note');
    }
  };

  const handleUpdateTodo = async () => {
    if (!editingTodo || !newTodoTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('personal_todos')
        .update({
          title: newTodoTitle.trim(),
          content: newTodoContent.trim() || null
        })
        .eq('id', editingTodo.id)
        .select()
        .single();

      if (error) throw error;

      setTodos(todos.map(todo => 
        todo.id === editingTodo.id ? data : todo
      ));
      setShowEditDialog(false);
      setEditingTodo(null);
      setNewTodoTitle("");
      setNewTodoContent("");
      toast.success('Note updated successfully');
    } catch (error) {
      console.error('Error updating todo:', error);
      toast.error('Failed to update note');
    }
  };

  const toggleTodoComplete = async (todo: PersonalTodo) => {
    try {
      const { data, error } = await supabase
        .from('personal_todos')
        .update({ completed: !todo.completed })
        .eq('id', todo.id)
        .select()
        .single();

      if (error) throw error;

      setTodos(todos.map(t => t.id === todo.id ? data : t));
      toast.success(data.completed ? 'Note completed' : 'Note marked as incomplete');
    } catch (error) {
      console.error('Error toggling todo:', error);
      toast.error('Failed to update note');
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      const { error } = await supabase
        .from('personal_todos')
        .delete()
        .eq('id', todoId);

      if (error) throw error;

      setTodos(todos.filter(t => t.id !== todoId));
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleEditTodo = (todo: PersonalTodo) => {
    setEditingTodo(todo);
    setNewTodoTitle(todo.title);
    setNewTodoContent(todo.content || "");
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setNewTodoTitle("");
    setNewTodoContent("");
    setEditingTodo(null);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading notes...</p>
        </div>
      </div>
    );
  }



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
            onClick={() => toggleTodoComplete(todo)}
          >
            <div className="flex items-start gap-3 mb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTodoComplete(todo);
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
              <span>{new Date(todo.updated_at).toLocaleDateString()}</span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTodo(todo);
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTodo(todo.id);
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

      {/* Edit Note Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
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
                  setShowEditDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateTodo}
                className="bg-warning hover:bg-warning/90 text-warning-foreground"
                disabled={!newTodoTitle.trim()}
              >
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}