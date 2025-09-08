import { useState, useEffect } from "react";
import { Plus, Users, UserPlus, Search, Crown, User } from "lucide-react";
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

interface Team {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  profiles?: {
    name: string;
  };
  team_members?: TeamMember[];
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    name: string;
    user_id: string;
  };
}

interface Profile {
  user_id: string;
  name: string;
}

export function TeamsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  
  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
  });
  
  const [newMember, setNewMember] = useState({
    user_id: "",
    role: "member",
  });

  useEffect(() => {
    if (user) {
      fetchTeams();
      fetchProfiles();
    }
  }, [user]);

  const fetchTeams = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        profiles!teams_created_by_fkey(name),
        team_members(
          id,
          user_id,
          role,
          joined_at,
          profiles!team_members_user_id_fkey(name, user_id)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive",
      });
      return;
    }

    setTeams(data || []);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, name')
      .order('name');

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }

    setProfiles(data || []);
  };

  const createTeam = async () => {
    if (!user || !newTeam.name.trim()) return;

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert([{
        ...newTeam,
        created_by: user.id,
      }])
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError);
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
      });
      return;
    }

    // Add creator as team leader
    const { error: memberError } = await supabase
      .from('team_members')
      .insert([{
        team_id: teamData.id,
        user_id: user.id,
        role: 'leader',
      }]);

    if (memberError) {
      console.error('Error adding team creator as member:', memberError);
    }

    toast({
      title: "Success",
      description: "Team created successfully",
    });

    setShowCreateDialog(false);
    setNewTeam({ name: "", description: "" });
    fetchTeams();
  };

  const addTeamMember = async () => {
    if (!selectedTeam || !newMember.user_id) return;

    const { error } = await supabase
      .from('team_members')
      .insert([{
        team_id: selectedTeam,
        user_id: newMember.user_id,
        role: newMember.role,
      }]);

    if (error) {
      console.error('Error adding team member:', error);
      toast({
        title: "Error",
        description: "Failed to add team member",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Team member added successfully",
    });

    setShowAddMemberDialog(false);
    setNewMember({ user_id: "", role: "member" });
    setSelectedTeam("");
    fetchTeams();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader': return <Crown className="h-4 w-4 text-yellow-500" />;
      default: return <User className="h-4 w-4 text-blue-500" />;
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading teams...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Teams</h1>
          <p className="text-muted-foreground mt-1">Manage your teams and members</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="team">Select Team</Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="user">Select User</Label>
                  <Select value={newMember.user_id} onValueChange={(value) => setNewMember({ ...newMember, user_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newMember.role} onValueChange={(value) => setNewMember({ ...newMember, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="leader">Leader</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={addTeamMember} className="flex-1">
                    Add Member
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                New Team
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    placeholder="Enter team name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTeam.description}
                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                    placeholder="Team description"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={createTeam} className="flex-1">
                    Create Team
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <Card key={team.id} className="bg-card hover:shadow-smooth transition-all duration-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{team.name}</CardTitle>
              </div>
              {team.description && (
                <CardDescription className="text-sm">
                  {team.description}
                </CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {team.profiles?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span>Created by {team.profiles?.name || 'Unknown'}</span>
              </div>
              
              {team.team_members && team.team_members.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Members ({team.team_members.length})</p>
                  <div className="space-y-1">
                    {team.team_members.slice(0, 3).map((member) => (
                      <div key={member.id} className="flex items-center gap-2 text-sm">
                        {getRoleIcon(member.role)}
                        <span>{member.profiles?.name || 'Unknown'}</span>
                        <Badge variant="secondary" className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                    ))}
                    {team.team_members.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{team.team_members.length - 3} more members
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2 border-t">
                <Badge variant="outline" className="text-xs">
                  {team.team_members?.length || 0} members
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(team.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No teams found.</p>
          <Button 
            className="mt-4" 
            onClick={() => setShowCreateDialog(true)}
          >
            Create your first team
          </Button>
        </div>
      )}
    </div>
  );
}