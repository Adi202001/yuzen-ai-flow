import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Image,
  File,
  Download,
  Trash2,
  Search,
  Filter,
  FolderOpen,
  HardDrive,
  Cloud
} from "lucide-react";

const files = [
  {
    id: 1,
    name: "Q4_Financial_Report.pdf",
    type: "pdf",
    size: "2.4 MB",
    uploadedBy: "Sarah Wilson",
    uploadedAt: "2024-01-10T10:30:00Z",
    category: "Reports"
  },
  {
    id: 2,
    name: "Team_Meeting_Notes.docx", 
    type: "document",
    size: "156 KB",
    uploadedBy: "Mike Johnson",
    uploadedAt: "2024-01-09T15:45:00Z",
    category: "Meeting Notes"
  },
  {
    id: 3,
    name: "Product_Mockups.fig",
    type: "design",
    size: "12.8 MB", 
    uploadedBy: "Alex Chen",
    uploadedAt: "2024-01-08T09:20:00Z",
    category: "Design"
  },
  {
    id: 4,
    name: "Company_Logo.png",
    type: "image",
    size: "856 KB",
    uploadedBy: "Emma Davis",
    uploadedAt: "2024-01-07T14:15:00Z",
    category: "Assets"
  },
  {
    id: 5,
    name: "Project_Proposal.pdf",
    type: "pdf", 
    size: "3.1 MB",
    uploadedBy: "John Smith",
    uploadedAt: "2024-01-06T11:00:00Z",
    category: "Proposals"
  },
  {
    id: 6,
    name: "Training_Video.mp4",
    type: "video",
    size: "45.2 MB",
    uploadedBy: "Sarah Wilson", 
    uploadedAt: "2024-01-05T16:30:00Z",
    category: "Training"
  }
];

const storageStats = {
  used: 12.5,
  total: 15,
  files: files.length
};

export function FilesSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-8 w-8 text-red-500" />;
      case "image":
        return <Image className="h-8 w-8 text-blue-500" />;
      case "document":
        return <FileText className="h-8 w-8 text-blue-600" />;
      case "design":
        return <File className="h-8 w-8 text-purple-500" />;
      case "video":
        return <File className="h-8 w-8 text-orange-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "Reports": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      "Meeting Notes": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
      "Design": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      "Assets": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      "Proposals": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      "Training": "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
    };
    return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(files.map(f => f.category)))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">File Management</h1>
          <p className="text-muted-foreground">Upload, organize, and share files with your team</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button variant="hero" className="gap-2">
                <Upload className="h-5 w-5" />
                Upload Files
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Upload Files</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    Drag & Drop Files Here
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse files
                  </p>
                  <Button variant="outline">
                    Browse Files
                  </Button>
                </div>
                
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setShowUploadDialog(false)}>
                    Upload
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" className="gap-2">
            <FolderOpen className="h-5 w-5" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Storage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-elegant">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <HardDrive className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Storage Used</p>
                  <p className="text-2xl font-bold text-foreground">
                    {storageStats.used}GB
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>of {storageStats.total}GB</span>
                <span>{Math.round((storageStats.used / storageStats.total) * 100)}%</span>
              </div>
              <Progress value={(storageStats.used / storageStats.total) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-success-light rounded-lg mx-auto mb-4">
              <FileText className="h-6 w-6 text-success" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">{storageStats.files}</h3>
            <p className="text-sm text-muted-foreground">Total Files</p>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-accent-light rounded-lg mx-auto mb-4">
              <Cloud className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Sync</h3>
            <p className="text-sm text-muted-foreground">Google Drive Connected</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-elegant">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {category === "all" ? "All Files" : category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Grid */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Files ({filteredFiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="p-4 rounded-lg border border-border bg-card-elevated hover:shadow-smooth transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate text-sm">
                        {file.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">{file.size}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Badge className={getCategoryColor(file.category)} variant="outline">
                    {file.category}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    <p>Uploaded by {file.uploadedBy}</p>
                    <p>{new Date(file.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredFiles.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No files found</p>
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory !== "all"
                  ? "Try adjusting your search or filters"
                  : "Upload your first file to get started"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}