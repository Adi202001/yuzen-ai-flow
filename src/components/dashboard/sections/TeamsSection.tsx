import { useState, useEffect } from "react";
import { Plus, Users, UserPlus, Search, Crown, User, MoreVertical } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Mock data for teams
  const mockTeams: Team[] = [
    {
      id: "1",
      name: "Development Team",
      description: "Frontend and backend development team",
      created_by: "1",
      created_at: new Date().toISOString(),
      profiles: { name: "John Doe" },
      team_members: [
        {
          id: "1",
          user_id: "1",
          role: "admin",
          joined_at: new Date().toISOString(),
          profiles: { name: "John Doe", user_id: "1" }
        },
        {
          id: "2",
          user_id: "2",
          role: "member",
          joined_at: new Date().toISOString(),
          profiles: { name: "Jane Smith", user_id: "2" }
        }
      ]
    },
    {
      id: "2",
      name: "Design Team",
      description: "UI/UX design team",
      created_by: "2",
      created_at: new Date().toISOString(),
      profiles: { name: "Jane Smith" },
      team_members: [
        {
          id: "3",
          user_id: "2",
          role: "admin",
          joined_at: new Date().toISOString(),
          profiles: { name: "Jane Smith", user_id: "2" }
        },
        {
          id: "4",
          user_id: "3",
          role: "member",
          joined_at: new Date().toISOString(),
          profiles: { name: "Bob Johnson", user_id: "3" }
        }
      ]
    }
  ];

  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Fetch all users from the database
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, name')
          .order('name');

        if (error) {
          console.error('Error fetching profiles:', error);
          toast({
            title: "Error",
            description: "Failed to load users from database.",
            variant: "destructive",
          });
          return;
        }

        if (data) {
          setProfiles(data);
        }
      } catch (error) {
        console.error('Error fetching profiles:', error);
      }
    };

    fetchProfiles();
  }, []);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [teamToEditOrDelete, setTeamToEditOrDelete] = useState<Team | null>(null);

  const [newTeam, setNewTeam] = useState({
    name: "",
    description: "",
  });

  const [newMember, setNewMember] = useState({
    user_id: "",
    role: "member",
  });

  const [newMemberInEdit, setNewMemberInEdit] = useState({
    user_id: "",
    role: "member",
  });

  const createTeam = () => {
    if (!newTeam.name || !newTeam.description) {
      toast({
        title: "Error",
        description: "Please fill in all fields for the new team.",
        variant: "destructive",
      });
      return;
    }

    const newTeamData: Team = {
      id: String(teams.length + 1), // Simple ID generation
      name: newTeam.name,
      description: newTeam.description,
      created_by: user?.id || "unknown",
      created_at: new Date().toISOString(),
      profiles: { name: user?.user_metadata?.name || "Unknown" },
      team_members: [],
    };

    setTeams((prevTeams) => [...prevTeams, newTeamData]);
    toast({
      title: "Team Created",
      description: "Your new team has been created.",
    });
    setShowCreateDialog(false);
    setNewTeam({ name: "", description: "" });
  };

  const addTeamMember = () => {
    if (!selectedTeam || !newMember.user_id || !newMember.role) {
      toast({
        title: "Error",
        description: "Please select a team, user, and role.",
        variant: "destructive",
      });
      return;
    }

    setTeams((prevTeams) =>
      prevTeams.map((team) =>
        team.id === selectedTeam
          ? {
              ...team,
              team_members: [
                ...(team.team_members || []),
                {
                  id: String(team.team_members?.length + 1 || 1), // Simple ID generation
                  user_id: newMember.user_id,
                  role: newMember.role,
                  joined_at: new Date().toISOString(),
                  profiles: profiles.find((p) => p.user_id === newMember.user_id),
                },
              ],
            }
          : team
      )
    );

    toast({
      title: "Member Added",
      description: "New member has been added to the team.",
    });
    setShowAddMemberDialog(false);
    setNewMember({ user_id: "", role: "member" });
  };

  const handleEditTeam = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (team) {
      setTeamToEditOrDelete(team);
      setShowEditDialog(true);
    }
  };

  const handleDeleteTeam = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (team) {
      setTeamToEditOrDelete(team);
      setShowDeleteDialog(true);
    }
  };

  const confirmDeleteTeam = () => {
    if (teamToEditOrDelete) {
      setTeams((prevTeams) => prevTeams.filter((team) => team.id !== teamToEditOrDelete.id));
      toast({
        title: "Team Deleted",
        description: `Team "${teamToEditOrDelete.name}" has been deleted.`,
      });
      setShowDeleteDialog(false);
      setTeamToEditOrDelete(null);
    }
  };

  const saveEditedTeam = () => {
    if (teamToEditOrDelete) {
      setTeams((prevTeams) =>
        prevTeams.map((team) => (team.id === teamToEditOrDelete.id ? teamToEditOrDelete : team))
      );
      toast({
        title: "Team Updated",
        description: `Team "${teamToEditOrDelete.name}" has been updated.`,
      });
      setShowEditDialog(false);
      setTeamToEditOrDelete(null);
    }
  };

  const addMemberToEditedTeam = () => {
    if (!teamToEditOrDelete || !newMemberInEdit.user_id || !newMemberInEdit.role) {
      toast({
        title: "Error",
        description: "Please select a user and role to add.",
        variant: "destructive",
      });
      return;
    }

    const userToAdd = profiles.find((p) => p.user_id === newMemberInEdit.user_id);

    if (userToAdd) {
      const updatedMembers = [
        ...(teamToEditOrDelete.team_members || []),
        {
          id: String((teamToEditOrDelete.team_members?.length || 0) + 1), // Simple ID generation
          user_id: userToAdd.user_id,
          role: newMemberInEdit.role,
          joined_at: new Date().toISOString(),
          profiles: { name: userToAdd.name, user_id: userToAdd.user_id },
        },
      ];

      setTeamToEditOrDelete((prev) =>
        prev ? { ...prev, team_members: updatedMembers } : null
      );
      setNewMemberInEdit({ user_id: "", role: "member" });
      toast({
        title: "Member Added",
        description: `${userToAdd.name} added to ${teamToEditOrDelete.name}.`,
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader': return <Crown className="h-4 w-4 text-yellow-500" />;
      default: return <User className="h-4 w-4 text-blue-500" />;
    }
  };

  const filteredTeams = teams.filter(team => {
    const searchLower = searchTerm.toLowerCase();
    return (
      team.name.toLowerCase().includes(searchLower) ||
      (team.description?.toLowerCase() || '').includes(searchLower)
    );
  });

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
              <Button 
                variant="outline" 
                className="transition-all duration-300 hover:bg-primary/5 hover:border-primary/50 hover:text-primary group"
              >
                <UserPlus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                <span>Add Member</span>
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
                      {profiles
                        .filter((profile) => {
                          const team = teams.find(t => t.id === selectedTeam);
                          return !team?.team_members?.some(m => m.user_id === profile.user_id);
                        })
                        .map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.name}{profile.user_id === user?.id ? ' (You)' : ''}
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
              <Button 
                className="bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                variant="hero"
              >
                <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                <span>New Team</span>
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
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 transition-colors duration-200 group-focus-within:text-primary" />
        <Input
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-muted-foreground/20 hover:border-muted-foreground/40 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
        />
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <Card 
            key={team.id} 
            className="bg-card hover:shadow-smooth hover:shadow-brand/10 hover:-translate-y-1 transition-all duration-300 border border-border/50 hover:border-primary/30 group"
          >
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-200" />
                <CardTitle className="text-lg group-hover:text-primary transition-colors duration-200">
                  {team.name}
                </CardTitle>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditTeam(team.id)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteTeam(team.id)}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            {team.description && (
                <CardDescription className="text-sm px-6 pb-3">
                  {team.description}
                </CardDescription>
              )}
            
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                <Avatar className="h-6 w-6 group-hover:ring-2 group-hover:ring-primary/30 transition-all duration-200">
                  <AvatarFallback className="text-xs bg-secondary group-hover:bg-secondary/80 transition-colors">
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
                      <div key={member.id} className="flex items-center gap-2 text-sm group-hover:bg-secondary/30 rounded-md p-1 -mx-1 transition-colors duration-200">
                        <span className="group-hover:scale-110 transition-transform duration-200">
                          {getRoleIcon(member.role)}
                        </span>
                        <span className="group-hover:text-foreground transition-colors">
                          {member.profiles?.name || 'Unknown'}
                        </span>
                        <Badge 
                          variant={member.role === 'leader' ? 'default' : 'secondary'} 
                          className="text-xs group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30 transition-colors duration-200"
                        >
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
              
              <div className="flex justify-between items-center pt-2 border-t border-border/50 group-hover:border-primary/30 transition-colors duration-200">
                <Badge 
                  variant="outline" 
                  className="text-xs group-hover:bg-primary/5 group-hover:border-primary/30 group-hover:text-primary transition-colors duration-200"
                >
                  {team.team_members?.length || 0} members
                </Badge>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-200">
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
            className="mt-4 transition-all duration-300 hover:scale-105 hover:shadow-lg" 
            onClick={() => setShowCreateDialog(true)}
            variant="hero"
          >
            Create your first team
          </Button>
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="edit-name">Team Name</Label>
              <Input
                id="edit-name"
                value={teamToEditOrDelete?.name || ""}
                onChange={(e) =>
                  setTeamToEditOrDelete((prev) => prev ? { ...prev, name: e.target.value } : null)
                }
                placeholder="Enter team name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={teamToEditOrDelete?.description || ""}
                onChange={(e) =>
                  setTeamToEditOrDelete((prev) => prev ? { ...prev, description: e.target.value } : null)
                }
                placeholder="Team description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-md font-semibold">Team Members</h3>
              {teamToEditOrDelete?.team_members?.map((member) => (
                <div key={member.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(member.role)}
                    <span>{member.profiles?.name || 'Unknown'}</span>
                  </div>
                  <Badge variant={member.role === 'leader' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                </div>
              ))}
              <div className="flex gap-2">
                <Select
                  value={newMemberInEdit.user_id}
                  onValueChange={(value) => setNewMemberInEdit({ ...newMemberInEdit, user_id: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles
                      .filter((profile) => {
                        return !teamToEditOrDelete?.team_members?.some(m => m.user_id === profile.user_id);
                      })
                      .map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.name}{profile.user_id === user?.id ? ' (You)' : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select
                  value={newMemberInEdit.role}
                  onValueChange={(value) => setNewMemberInEdit({ ...newMemberInEdit, role: value })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="leader">Leader</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addMemberToEditedTeam}>Add</Button>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={saveEditedTeam} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team{" "}
              <span className="font-bold">{teamToEditOrDelete?.name}</span> and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTeam} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}