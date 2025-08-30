import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  CheckSquare, 
  FileText, 
  TrendingUp,
  Clock,
  Calendar,
  Target,
  Zap
} from "lucide-react";
import yuzenHero from "@/assets/yuzen-hero.jpg";

const stats = [
  {
    title: "Team Members",
    value: "5",
    change: "+2 this month",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950"
  },
  {
    title: "Active Tasks",
    value: "23",
    change: "+5 today",
    icon: CheckSquare,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950"
  },
  {
    title: "Files Shared",
    value: "128",
    change: "+12 this week",
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950"
  },
  {
    title: "AI Interactions",
    value: "89/150",
    change: "61 remaining",
    icon: Zap,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950"
  },
];

const recentActivities = [
  { user: "Sarah Wilson", action: "completed task", target: "Update user documentation", time: "2 minutes ago" },
  { user: "Mike Johnson", action: "uploaded file", target: "Q4 Report.pdf", time: "15 minutes ago" },
  { user: "Alex Chen", action: "checked in", target: "Morning attendance", time: "1 hour ago" },
  { user: "Emma Davis", action: "created task", target: "Review client feedback", time: "2 hours ago" },
];

export function OverviewSection() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-primary shadow-brand">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={yuzenHero} 
            alt="Yuzen AI Platform" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative p-8 text-primary-foreground">
          <h1 className="text-4xl font-bold mb-4">Welcome to Yuzen AI</h1>
          <p className="text-xl opacity-90 mb-6 max-w-2xl">
            Streamline your business operations with our AI-first management platform. 
            Attendance, tasks, files, and intelligent assistance - all in one place.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button variant="hero" size="lg">
              <Target className="mr-2 h-5 w-5" />
              Quick Setup
            </Button>
            <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/20">
              <TrendingUp className="mr-2 h-5 w-5" />
              View Analytics
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-card shadow-elegant hover:shadow-brand transition-all duration-300 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Progress */}
        <Card className="col-span-2 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Project Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Website Redesign</span>
                <span className="text-sm text-muted-foreground">75%</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Mobile App Development</span>
                <span className="text-sm text-muted-foreground">45%</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Team Training</span>
                <span className="text-sm text-muted-foreground">90%</span>
              </div>
              <Progress value={90} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user}</span>
                    <span className="text-muted-foreground"> {activity.action} </span>
                    <span className="font-medium">{activity.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-16 flex-col gap-2">
              <Users className="h-6 w-6" />
              <span>Check Attendance</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2">
              <CheckSquare className="h-6 w-6" />
              <span>Create Task</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span>Upload File</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-2">
              <Calendar className="h-6 w-6" />
              <span>Schedule Meeting</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}