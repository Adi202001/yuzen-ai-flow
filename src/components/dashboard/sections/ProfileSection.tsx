import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pencil, Check, X, Mail, Phone, Calendar, MapPin, Briefcase, User, Users } from "lucide-react";

export function ProfileSection() {
  const { user, profile } = useAuth();
  
  // Temporary updateProfile function until added to useAuth
  const updateProfile = async (updates: Partial<typeof profile>) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  };
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    department: "",
    location: "",
    bio: ""
  } as {
    name: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    location: string;
    bio: string;
  });
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        email: user?.email || "",
        phone: profile.phone || "",
        position: profile.position || "",
        department: profile.department || "",
        location: profile.location || "",
        bio: profile.bio || ""
      });
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await updateProfile({
        name: formData.name,
        phone: formData.phone,
        position: formData.position,
        department: formData.department,
        location: formData.location,
        bio: formData.bio,
        avatar_url: avatarUrl
      });
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      setAvatarUrl(publicUrl);
      
      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          My Profile
        </h1>
        {!isEditing ? (
          <Button 
            onClick={() => setIsEditing(true)}
            className="transition-all duration-300 hover:scale-105 hover:shadow-md"
            variant="outline"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditing(false)}
              className="transition-all duration-300 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading}
              className="transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="transition-all duration-300 hover:shadow-lg relative overflow-visible">
            <div className="relative">
              {/* Top border that extends full width */}
              <div className="h-1 bg-gradient-to-r from-primary to-primary/80"></div>
              
              {/* Banner with reduced height */}
              <div className="h-16 bg-gradient-to-r from-primary to-primary/80 relative">
                <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                  <div className="relative group">
                    <Avatar className="h-32 w-32 border-4 border-background transition-all duration-300 group-hover:ring-4 group-hover:ring-primary/20">
                      <AvatarImage src={avatarUrl} alt={formData.name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white">
                        {formData.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <input
                          type="file"
                          id="avatar-upload"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                        <Label
                          htmlFor="avatar-upload"
                          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-primary text-white px-3 py-1 rounded-full text-xs font-medium cursor-pointer hover:bg-primary/90 transition-colors shadow-md"
                        >
                          Change Photo
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <CardContent className="pt-16 pb-6">
              <div className="flex flex-col items-center text-center space-y-1">
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors duration-300">
                  {formData.name}
                </h3>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {formData.position}
                </p>
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                  {formData.department}
                </p>
                
                <div className="flex items-center gap-3 mt-4 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{formData.location || "Not specified"}</span>
                </div>
                
                <div className="mt-4 flex gap-3">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:scale-110 hover:shadow-sm"
                    title="Send email"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-full transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:scale-110 hover:shadow-sm"
                    title="Call"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">About Me</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      value={formData.bio}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {formData.bio || "No bio provided"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Personal Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="transition-all duration-300 hover:shadow-lg">
            <CardHeader className="p-4">
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <Label htmlFor="name" className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-300">
                      <User className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="group-hover:text-foreground transition-colors">{formData.name || "Not specified"}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 group">
                  <Label className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Email</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-300">
                    <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="group-hover:text-foreground transition-colors">{formData.email || "Not specified"}</span>
                  </div>
                </div>

                <div className="space-y-2 group">
                  <Label htmlFor="email" className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-300">
                      <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="group-hover:text-foreground transition-colors">{formData.email || "Not specified"}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 group">
                  <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Phone</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-300">
                      <Phone className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="group-hover:text-foreground transition-colors">{formData.phone || "Not specified"}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 group">
                  <Label className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Member Since</Label>
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-300">
                    <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="group-hover:text-foreground transition-colors">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2 group">
                  <Label htmlFor="position" className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Position</Label>
                  {isEditing ? (
                    <Input
                      id="position"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-300">
                      <Briefcase className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="group-hover:text-foreground transition-colors">{formData.position || "Not specified"}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 group">
                  <Label htmlFor="department" className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Department</Label>
                  {isEditing ? (
                    <Input
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-300">
                      <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="group-hover:text-foreground transition-colors">{formData.department || "Not specified"}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 group">
                  <Label htmlFor="location" className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Location</Label>
                  {isEditing ? (
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all duration-300">
                      <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="group-hover:text-foreground transition-colors">{formData.location || "Not specified"}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Change Password</h4>
                    <p className="text-sm text-muted-foreground">Update your account password</p>
                  </div>
                  <Button variant="outline">Change</Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
