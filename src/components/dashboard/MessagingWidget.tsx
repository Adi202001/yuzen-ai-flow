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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Plus, Send, Users, User, X, Minimize2 } from 'lucide-react';
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

export function MessagingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedConversationName, setSelectedConversationName] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [conversationType, setConversationType] = useState<'group' | 'direct'>('direct');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
  
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

  // Calculate unread messages
  useEffect(() => {
    if (!user) return;
    
    // For demo purposes, count messages from others
    const unread = messages.filter(msg => 
      msg.sender_id !== user.id && 
      (msg.recipient_id === user.id || msg.group_id)
    ).length;
    
    setUnreadCount(unread);
  }, [messages, user]);

  const fetchData = async () => {
    await Promise.all([
      fetchMessages(),
      fetchGroups(),
      fetchProfiles()
    ]);
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

    const formattedMessages = (data as any[]).map((msg: any) => ({
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
    
    // Validate conversation selection for direct messages
    if (conversationType === 'direct' && !selectedConversation) {
      toast({
        title: "Select a recipient",
        description: "Please select a user to message first",
        variant: "destructive",
      });
      return;
    }

    // Validate conversation selection for group messages
    if (conversationType === 'group' && !selectedConversation) {
      toast({
        title: "Select a group",
        description: "Please select a group to message first",
        variant: "destructive",
      });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    
    // Get the group or recipient name for the optimistic update
    const groupName = conversationType === 'group' && selectedConversation
      ? groups.find(g => g.id === selectedConversation)?.name
      : undefined;
    
    const recipientName = conversationType === 'direct' && selectedConversation
      ? profiles.find(p => p.user_id === selectedConversation)?.name
      : undefined;
    
    // Create the message object for optimistic update
    const newMessageObj: Message = {
      id: tempId,
      content: newMessage,
      sender_id: user.id,
      created_at: now,
      sender_name: user.user_metadata?.full_name || 'You',
      ...(conversationType === 'group' && selectedConversation
        ? { 
            group_id: selectedConversation,
            group_name: groupName
          }
        : {
            recipient_id: selectedConversation,
            recipient_name: recipientName
          })
    };

    // Optimistically update the UI
    setMessages(prev => [...prev, newMessageObj]);
    setNewMessage('');
    setIsLoading(true);

    try {
      // Call the database function to send the message
      const { data, error } = await supabase.rpc('send_message', {
        p_content: newMessage,
        p_sender_id: user.id,
        p_message_type: 'text',
        p_group_id: conversationType === 'group' ? selectedConversation : null,
        p_recipient_id: conversationType === 'direct' ? selectedConversation : null
      });

      if (error) throw error;
      if (!data) throw new Error('No data returned from server');

      console.log('Message sent successfully:', data);

      // Parse the returned JSON data
      const messageData = data as unknown as Message;
      
      // Update the message with the real ID from the database
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? {
                ...messageData,
                sender_name: user.user_metadata?.full_name || 'You',
                ...(messageData.recipient_id && {
                  recipient_name: profiles.find(p => p.user_id === messageData.recipient_id)?.name
                }),
                ...(messageData.group_id && {
                  group_name: groups.find(g => g.id === messageData.group_id)?.name
                })
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setNewMessage(newMessage); // Restore the message that failed to send
      
      toast({
        title: "Error sending message",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || !user) return;

    const { data, error } = await (supabase
      .from('groups')
      .insert([
        {
          name: newGroupName,
          created_by: user.id
        }
      ])
      .select()
      .single() as any);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
      return;
    }

    // Add creator to the group
    if (data) {
      await (supabase
        .from('group_members')
        .insert([
          {
            group_id: data.id,
            user_id: user.id,
            role: 'admin'
          }
        ]) as any);
    }

    setNewGroupName('');
    setShowNewConversation(false);
    toast({
      title: "Success",
      description: "Group created successfully",
    });
  };

  const startNewConversation = async () => {
    if (!selectedRecipient) return;
    
    const recipient = profiles.find(p => p.user_id === selectedRecipient);
    if (recipient) {
      setSelectedConversationName(recipient.name);
    }
    
    setSelectedConversation(selectedRecipient);
    setConversationType('direct');
    setShowNewConversation(false);
    
    // Ensure we have the latest messages for this conversation
    await fetchMessages();
  };

  const getConversations = () => {
    const conversations: any[] = [];
    const conversationMap = new Map();

    // Process all messages to create conversations
    messages.forEach(msg => {
      if (msg.group_id) {
        // Group message
        if (!conversationMap.has(`group_${msg.group_id}`)) {
          const group = groups.find(g => g.id === msg.group_id);
          if (group) {
            conversationMap.set(`group_${msg.group_id}`, {
              id: msg.group_id,
              name: group.name,
              type: 'group',
              icon: Users,
              lastMessage: msg.created_at,
              unread: msg.sender_id !== user?.id && !msg.read_at
            });
          }
        }
      } else if (msg.recipient_id) {
        // Direct message
        const otherUserId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
        const otherUserName = msg.sender_id === user?.id ? msg.recipient_name : msg.sender_name;
        const key = `user_${otherUserId}`;
        
        if (!conversationMap.has(key) || new Date(msg.created_at) > new Date(conversationMap.get(key).lastMessage || 0)) {
          conversationMap.set(key, {
            id: otherUserId,
            name: otherUserName || 'Unknown User',
            type: 'direct',
            icon: User,
            lastMessage: msg.created_at,
            unread: msg.sender_id !== user?.id && !msg.read_at
          });
        }
      }
    });

    // Convert map to array and sort by last message time
    return Array.from(conversationMap.values()).sort((a, b) => 
      new Date(b.lastMessage).getTime() - new Date(a.lastMessage).getTime()
    );
  };

  const getConversationMessages = () => {
    if (!selectedConversation) return [];

    const filtered = messages.filter(msg => {
      if (conversationType === 'group') {
        return msg.group_id === selectedConversation;
      } else {
        return (msg.sender_id === user?.id && msg.recipient_id === selectedConversation) ||
               (msg.recipient_id === user?.id && msg.sender_id === selectedConversation);
      }
    });

    // Mark messages as read
    if (user) {
      const unreadMessages = filtered.filter(
        msg => msg.recipient_id === user.id && !msg.read_at
      );
      
      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg.id);
        supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', messageIds)
          .then(() => {
            // Update local state to reflect read status
            setMessages(prev => 
              prev.map(msg => 
                messageIds.includes(msg.id) ? { ...msg, read_at: new Date().toISOString() } : msg
              )
            );
          });
      }
    }

    return filtered;
  };

  const conversations = getConversations();
  const conversationMessages = getConversationMessages();
  
  // Update unread count whenever messages change
  useEffect(() => {
    if (!user) return;
    
    const unread = messages.filter(msg => 
      (msg.recipient_id === user.id || msg.group_id) && 
      msg.sender_id !== user.id && 
      !msg.read_at
    ).length;
    
    setUnreadCount(unread);
  }, [messages, user]);

  return (
    <>
      {/* Chat Panel (attached above the bottom bar) */}
      {isOpen && (
        <div className="fixed bottom-10 right-6 z-50 w-[320px] h-[420px] animate-fade-in">
          <Card className="h-full flex flex-col shadow-xl border rounded-t-lg rounded-b-none bg-card">
            {/* Header */}
            <CardHeader className="py-2 border-b rounded-t-lg bg-card">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Messaging
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7"
                      >
                        <Plus className="w-4 h-4" />
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
                              onClick={startNewConversation} 
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
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-7 w-7"
                    title="Minimize"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                className={`flex-1 py-2 text-sm font-medium ${activeTab === 'chats' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                onClick={() => setActiveTab('chats')}
              >
                Chats
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium ${activeTab === 'contacts' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
                onClick={() => setActiveTab('contacts')}
              >
                Contacts
              </button>
            </div>

            {/* Content */}
            <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
              {activeTab === 'chats' && !selectedConversation ? (
                // Conversations List
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm">No conversations yet</p>
                        <p className="text-xs mt-1">Click + to start a new chat</p>
                      </div>
                    ) : (
                      conversations.map(conversation => {
                        const Icon = conversation.icon;
                        
                        return (
                          <div
                            key={conversation.id}
                            className="p-3 cursor-pointer hover:bg-secondary/80 transition-all duration-200 rounded-lg my-1"
                            onClick={() => {
                              setSelectedConversation(conversation.id);
                              setConversationType(conversation.type);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-secondary">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-sm">
                                  {conversation.name}
                                </p>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {conversation.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              ) : activeTab === 'chats' && selectedConversation ? (
                // Messages View
                <div className="flex flex-col h-full">
                  {/* Conversation Header */}
                  <div className="p-3 border-b flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {selectedConversationName ? selectedConversationName.charAt(0).toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {selectedConversationName || conversations.find(c => c.id === selectedConversation)?.name || 'Conversation'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conversationType === 'direct' ? 'Direct message' : 'Group chat'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-3 p-2">
                      {conversationMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center p-4">
                          <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
                          <p className="font-medium">No messages yet</p>
                          <p className="text-sm mt-1">
                            {conversationType === 'direct' 
                              ? `Start a conversation with ${selectedConversationName || 'this user'}` 
                              : 'Send a message to start the conversation'}
                          </p>
                        </div>
                      ) : (
                        conversationMessages.map(message => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] p-3 rounded-lg text-sm ${
                                message.sender_id === user?.id
                                  ? 'bg-primary text-primary-foreground rounded-tr-none'
                                  : 'bg-secondary rounded-tl-none'
                              }`}
                            >
                              {message.sender_id !== user?.id && conversationType === 'group' && (
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  {message.sender_name}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                              <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${message.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                <span>
                                  {new Date(message.created_at).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                                {message.sender_id === user?.id && (
                                  <span className="ml-1">
                                    {message.read_at ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-3 border-t">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder={selectedConversation ? "Type a message..." : "Select a conversation to start chatting"}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (newMessage.trim()) {
                                sendMessage();
                              }
                            }
                          }}
                          className="text-sm pr-12"
                          disabled={!selectedConversation || isLoading}
                        />
                        {isLoading && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={sendMessage} 
                        size="icon"
                        className="h-9 w-9 flex-shrink-0"
                        disabled={!newMessage.trim() || !selectedConversation || isLoading}
                        title="Send message"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // Contacts List
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {profiles
                      .filter(profile => profile.user_id !== user?.id)
                      .map(profile => (
                        <div
                          key={profile.user_id}
                          className="p-3 cursor-pointer hover:bg-secondary/80 transition-all duration-200 rounded-lg my-1 flex items-center gap-3"
                          onClick={() => {
                            setSelectedConversation(profile.user_id);
                            setSelectedConversationName(profile.name);
                            setConversationType('direct');
                            setActiveTab('chats');
                          }}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-secondary">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">
                              {profile.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              Start a new conversation
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Bar (always visible) */}
      <div className="fixed bottom-0 right-6 z-50">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-[320px] h-10 rounded-t-lg rounded-b-none bg-card border shadow-md flex items-center px-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex items-center justify-center h-6 w-6 rounded-full bg-secondary">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium">Messaging</span>
            {unreadCount > 0 && (
              <span className="ml-2 h-5 min-w-5 px-1 rounded-full bg-destructive text-white text-[10px] leading-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div className="text-muted-foreground">
            {isOpen ? (
              <span className="text-xs">Hide ▲</span>
            ) : (
              <span className="text-xs">Show ▼</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
