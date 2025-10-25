import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Discussion {
  id: string;
  message: string;
  user_id: string;
  created_at: string;
}

interface ProjectDiscussionsProps {
  projectId: string;
}

export function ProjectDiscussions({ projectId }: ProjectDiscussionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchDiscussions();
  }, [projectId]);

  const fetchDiscussions = async () => {
    try {
      const { data, error } = await supabase
        .from('project_discussions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDiscussions(data || []);
    } catch (error) {
      console.error('Error fetching discussions:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) {
      toast({
        title: "Validation Error",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase
        .from('project_discussions')
        .insert([{
          project_id: projectId,
          user_id: user.id,
          message: newMessage.trim(),
        }])
        .select()
        .single();

      if (error) throw error;

      setDiscussions([...discussions, data]);
      setNewMessage("");

      toast({
        title: "Success",
        description: "Message sent",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading discussions...</div>;
  }

  return (
    <div className="p-6 bg-card rounded-lg border">
      <h2 className="text-2xl font-bold mb-6">Project Discussions</h2>

      <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
        {discussions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No discussions yet. Start the conversation!</p>
          </div>
        ) : (
          discussions.map((discussion) => (
            <Card key={discussion.id} className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {discussion.user_id === user?.id ? 'ME' : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">
                      {discussion.user_id === user?.id ? 'You' : 'User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(discussion.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{discussion.message}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <Button onClick={sendMessage} disabled={sending} className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
