import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  Send, 
  Mic, 
  Search,
  FileText,
  Zap,
  Brain,
  Globe,
  Image as ImageIcon,
  MessageSquare
} from "lucide-react";

const chatHistory = [
  {
    id: 1,
    type: "user",
    message: "Can you help me analyze the Q4 financial report?",
    timestamp: "10:30 AM"
  },
  {
    id: 2,
    type: "ai",
    message: "I'd be happy to help you analyze the Q4 financial report! I can see you have a file named 'Q4_Financial_Report.pdf' in your files. Let me extract the key insights:\n\n• Revenue increased by 23% compared to Q3\n• Operating expenses decreased by 8%\n• Net profit margin improved to 15.2%\n• Cash flow remained positive throughout the quarter\n\nWould you like me to dive deeper into any specific area?",
    timestamp: "10:31 AM"
  },
  {
    id: 3,
    type: "user", 
    message: "What are the main risks mentioned in the report?",
    timestamp: "10:32 AM"
  },
  {
    id: 4,
    type: "ai",
    message: "Based on the report, the main risks identified are:\n\n1. **Market Competition**: Increased competition in the SaaS space\n2. **Talent Retention**: Key personnel turnover risk\n3. **Economic Uncertainty**: Potential recession impact on customer spending\n4. **Cybersecurity**: Data protection and privacy compliance\n\nThe report suggests mitigation strategies for each of these areas. Would you like me to explain the proposed solutions?",
    timestamp: "10:33 AM"
  }
];

const aiFeatures = [
  {
    title: "Document Analysis",
    description: "AI-powered analysis of uploaded documents with OCR support",
    icon: FileText,
    count: "45 documents processed"
  },
  {
    title: "Task Automation",
    description: "Intelligent task suggestions and automated workflows",
    icon: Zap,
    count: "12 automations active"
  },
  {
    title: "Smart Search",
    description: "Natural language search across all your organization data",
    icon: Search,
    count: "89 searches this month"
  },
  {
    title: "Internet Research",
    description: "Real-time information gathering and fact checking",
    icon: Globe,
    count: "23 research queries"
  }
];

const usageStats = {
  used: 89,
  total: 150,
  resetDate: "February 1, 2024"
};

export function AIAssistantSection() {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log("Sending message:", message);
      setMessage("");
    }
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice input functionality would be implemented here
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">AI Assistant</h1>
          <p className="text-muted-foreground">Intelligent assistance powered by advanced AI models</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1">
            <Zap className="h-4 w-4 mr-1" />
            {usageStats.used}/{usageStats.total} interactions
          </Badge>
          <Button variant="outline" className="gap-2">
            <Brain className="h-5 w-5" />
            Model Settings
          </Button>
        </div>
      </div>

      {/* Usage Stats */}
      <Card className="shadow-elegant">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">AI Usage This Month</h3>
              <p className="text-sm text-muted-foreground">
                Resets on {usageStats.resetDate}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">
                {usageStats.used}
              </p>
              <p className="text-sm text-muted-foreground">
                of {usageStats.total} interactions
              </p>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${(usageStats.used / usageStats.total) * 100}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              Chat with AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Chat Messages */}
            <ScrollArea className="h-96 px-6">
              <div className="space-y-4 py-4">
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    className={`flex ${chat.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        chat.type === "user"
                          ? "bg-gradient-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{chat.message}</p>
                      <p
                        className={`text-xs mt-2 ${
                          chat.type === "user"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {chat.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Ask me anything about your business..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="pr-12"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 ${
                      isListening ? "text-destructive" : "text-muted-foreground"
                    }`}
                    onClick={toggleVoiceInput}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={handleSendMessage} disabled={!message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                AI can analyze your files, answer questions, and help with tasks
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Features */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Capabilities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-3 rounded-lg bg-card-elevated hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                      <p className="text-xs text-accent mt-2 font-medium">
                        {feature.count}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 hover:bg-secondary"
              onClick={() => setMessage("Analyze my team's attendance patterns")}
            >
              <Bot className="h-6 w-6" />
              <span className="text-sm">Analyze Attendance</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 hover:bg-secondary"
              onClick={() => setMessage("Summarize today's completed tasks")}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">Task Summary</span>
            </Button>
            
            <Button
              variant="outline" 
              className="h-20 flex-col gap-2 hover:bg-secondary"
              onClick={() => setMessage("What files were uploaded this week?")}
            >
              <Search className="h-6 w-6" />
              <span className="text-sm">File Insights</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-20 flex-col gap-2 hover:bg-secondary"
              onClick={() => setMessage("Research industry trends for our business")}
            >
              <Globe className="h-6 w-6" />
              <span className="text-sm">Research</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}