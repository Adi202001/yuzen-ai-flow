import { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  FileText, 
  MessageSquare,
  Calendar,
  ClipboardList,
  Menu,
  Bell,
  Search,
  Settings,
  User,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const getNavigationItems = (userRole: string) => {
  const baseItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "attendance", label: "Attendance", icon: CheckSquare },
    { id: "projects", label: "Projects", icon: CheckSquare },
    { id: "teams", label: "Teams", icon: Users },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "personal-todos", label: "Personal Todos", icon: ClipboardList },
    { id: "files", label: "Files", icon: FileText },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "leave-requests", label: "Leave Requests", icon: ClipboardList },
  ];

  // Add admin/HR specific items
  if (userRole === 'admin' || userRole === 'hr') {
    baseItems.push(
      { id: "users", label: "Users", icon: Users },
      { id: "admin", label: "Admin Dashboard", icon: Settings }
    );
  }

  return baseItems;
};

export function DashboardLayout({ children, activeSection, onSectionChange }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, profile, signOut } = useAuth();
  
  const navigationItems = getNavigationItems(profile?.role || 'employee');

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="h-16 border-b border-border backdrop-blur-xl bg-card/80 sticky top-0 z-50">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gradient-primary">Yuzen</h1>
          </div>

          <div className="flex-1 max-w-md mx-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search..."
                className="pl-10 bg-background/50 border-input-border"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {profile?.name?.split(' ').map((n: string) => n[0]).join('') || user?.email?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-popover border-border" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => onSectionChange('profile')}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => onSectionChange('settings')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`bg-card border-r border-border transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-64"
        } sticky top-16 h-[calc(100vh-4rem)]`}>
          <div className="flex flex-col h-full">
            <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
              {navigationItems.map((item) => {
                const isActive = activeSection === item.id;
                const Icon = item.icon;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start gap-3 ${
                      sidebarCollapsed ? "px-3" : "px-4"
                    } ${isActive ? "bg-gradient-primary shadow-brand" : "hover:bg-secondary"}`}
                    onClick={() => onSectionChange(item.id)}
                  >
                    <Icon className="h-5 w-5" />
                    {!sidebarCollapsed && (
                      <span className="font-medium">{item.label}</span>
                    )}
                  </Button>
                );
              })}
            </nav>
            
            {/* Bottom section with divider, settings, and logout */}
            <div className="border-t border-border pt-2 pb-4 px-4 space-y-2">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 ${
                  sidebarCollapsed ? "px-3" : "px-4"
                } hover:bg-secondary`}
                onClick={() => onSectionChange('settings')}
              >
                <Settings className="h-5 w-5" />
                {!sidebarCollapsed && <span>Settings</span>}
              </Button>
              
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 text-destructive hover:bg-destructive/10 ${
                  sidebarCollapsed ? "px-3" : "px-4"
                }`}
                onClick={signOut}
              >
                <LogOut className="h-5 w-5" />
                {!sidebarCollapsed && <span>Logout</span>}
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}