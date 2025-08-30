import { useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { OverviewSection } from "./sections/OverviewSection";
import { AttendanceSection } from "./sections/AttendanceSection";
import { TasksSection } from "./sections/TasksSection";
import { FilesSection } from "./sections/FilesSection";
import { AIAssistantSection } from "./sections/AIAssistantSection";

export function Dashboard() {
  const [activeSection, setActiveSection] = useState("overview");

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "attendance":
        return <AttendanceSection />;
      case "tasks":
        return <TasksSection />;
      case "files":
        return <FilesSection />;
      case "ai-assistant":
        return <AIAssistantSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <DashboardLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {renderSection()}
    </DashboardLayout>
  );
}