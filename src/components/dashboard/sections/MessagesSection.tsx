import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Plus, Send, Users, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  group_id?: string;
  recipient_id?: string;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
  group_name?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  created_by: string;
}

interface Profile {
  user_id: string;
  name: string;
}

export function MessagesSection() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [conversationType, setConversationType] = useState<'group' | 'direct'>('group');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscriptions
    const messagesSubscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchMessages()
      )
      .subscribe();

    const groupsSubscription = supabase
      .channel('groups')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'groups' },
        () => fetchGroups()
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      groupsSubscription.unsubscribe();
    };
  }, [user]);

  const fetchData = async () => {
    await Promise.all([
      fetchMessages(),
      fetchGroups(),
      fetchProfiles()
    ]);
    setLoading(false);
  };

  const fetchMessages = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(name),
        recipient:profiles!messages_recipient_id_fkey(name),
        group:groups(name)
      `)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    const formattedMessages = data.map(msg => ({
      ...msg,
      sender_name: msg.sender?.name,
      recipient_name: msg.recipient?.name,
      group_name: msg.group?.name
    }));

    setMessages(formattedMessages);
  };

  const fetchGroups = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('groups')
      .select('*');

    if (error) {
      console.error('Error fetching groups:', error);
      return;
    }

    setGroups(data || []);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, name');

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    setProfiles(data || []);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const messageData: any = {
      content: newMessage,
      sender_id: user.id,
    };

    if (conversationType === 'group' && selectedConversation) {
      messageData.group_id = selectedConversation;
    } else if (conversationType === 'direct' && selectedConversation) {
      messageData.recipient_id = selectedConversation;
    }

    const { error } = await supabase
      .from('messages')
      .insert([messageData]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return;
    }

    setNewMessage('');
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || !user) return;

    const { data, error } = await supabase
      .from('groups')
      .insert([
        {
          name: newGroupName,
          created_by: user.id
        }
      ])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
      return;
    }

    // Add creator to the group
    await supabase
      .from('group_members')
      .insert([
        {
          group_id: data.id,
          user_id: user.id,
          role: 'admin'
        }
      ]);

    setNewGroupName('');
    setShowNewConversation(false);
    toast({
      title: "Success",
      description: "Group created successfully",
    });
  };

  const getConversations = () => {
    const conversations: any[] = [];

    // Add groups
    groups.forEach(group => {
      conversations.push({
        id: group.id,
        name: group.name,
        type: 'group',
        icon: Users
      });
    });

    // Add direct conversations
    const directMessages = messages.filter(msg => msg.recipient_id || msg.sender_id);
    const uniqueContacts = new Set();
    
    directMessages.forEach(msg => {
      const contactId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
      const contactName = msg.sender_id === user?.id ? msg.recipient_name : msg.sender_name;
      
      if (contactId && !uniqueContacts.has(contactId)) {
        uniqueContacts.add(contactId);
        conversations.push({
          id: contactId,
          name: contactName || 'Unknown User',
          type: 'direct',
          icon: User
        });
      }
    });

    return conversations;
  };

  const getConversationMessages = () => {
    if (!selectedConversation) return [];

    return messages.filter(msg => {
      if (conversationType === 'group') {
        return msg.group_id === selectedConversation;
      } else {
        return (msg.sender_id === user?.id && msg.recipient_id === selectedConversation) ||
               (msg.recipient_id === user?.id && msg.sender_id === selectedConversation);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const conversations = getConversations();
  const conversationMessages = getConversationMessages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Messages</h1>
          <p className="text-muted-foreground mt-2">
            Communicate with your team and colleagues
          </p>
        </div>
        
        <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
          <DialogTrigger asChild>
            <Button 
              className="transition-all duration-300 hover:shadow-lg hover:scale-105"
              variant="hero"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Conversation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={conversationType} onValueChange={(value: 'group' | 'direct') => setConversationType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Group Chat</SelectItem>
                    <SelectItem value="direct">Direct Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {conversationType === 'group' ? (
                <div>
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                  <Button onClick={createGroup} className="w-full mt-4">
                    Create Group
                  </Button>
                </div>
              ) : (
                <div>
                  <Label>Select User</Label>
                  <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles
                        .filter(profile => profile.user_id !== user?.id)
                        .map(profile => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => {
                      setSelectedConversation(selectedRecipient);
                      setConversationType('direct');
                      setShowNewConversation(false);
                    }}
                    className="w-full mt-4"
                    disabled={!selectedRecipient}
                  >
                    Start Chat
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)] animate-fade-in">
        {/* Conversations List */}
        <Card className="lg:col-span-1 shadow-elegant hover:shadow-brand transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[60vh]">
              {conversations.map(conversation => {
                const Icon = conversation.icon;
                const isActive = selectedConversation === conversation.id;
                
                return (
                  <div
                    key={conversation.id}
                    className={`p-3 cursor-pointer hover:bg-secondary/80 transition-all duration-200 rounded-lg mx-2 my-1 ${
                      isActive ? 'bg-secondary shadow-inner' : 'hover:shadow-sm'
                    }`}
                    onClick={() => {
                      setSelectedConversation(conversation.id);
                      setConversationType(conversation.type);
                    }}
                  >
                    <div className="flex items-center gap-3 group">
                      <div className="relative">
                        <Avatar className="h-10 w-10 group-hover:scale-110 transition-transform duration-200">
                          <AvatarFallback className={isActive ? 'bg-primary/10' : 'bg-secondary'}> 
                            <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          </AvatarFallback>
                        </Avatar>
                        {conversation.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'} group-hover:text-primary transition-colors`}>
                            {conversation.name}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {conversation.lastMessageTime}
                          </span>
                        </div>
                        <Badge 
                          variant={isActive ? 'default' : 'secondary'} 
                          className={`text-xs ${isActive ? 'bg-primary/20 text-primary' : ''} group-hover:bg-primary/10 group-hover:text-primary transition-colors`}
                        >
                          {conversation.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <Card className="lg:col-span-2 shadow-elegant hover:shadow-brand transition-shadow duration-300">
          <CardHeader>
            <CardTitle>
              {selectedConversation ? (
                conversations.find(c => c.id === selectedConversation)?.name || 'Conversation'
              ) : (
                'Select a conversation'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {selectedConversation ? (
              <div className="flex flex-col h-[60vh]">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {conversationMessages.map(message => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md p-3 rounded-lg transition-all duration-200 ${
                            message.sender_id === user?.id
                              ? 'bg-primary text-primary-foreground hover:shadow-lg hover:-translate-y-0.5'
                              : 'bg-secondary hover:shadow-sm hover:bg-secondary/80'
                          }`}
                        >
                          {message.sender_id !== user?.id && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {message.sender_name}
                            </p>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <Separator />
                
                <div className="p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="border-primary/20 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                    />
                    <Button 
                      onClick={sendMessage} 
                      size="icon" 
                      className="transition-all duration-200 hover:scale-105 hover:shadow-md"
                      disabled={!newMessage.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
                Select a conversation to start messaging
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}