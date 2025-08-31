import { useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { OverviewSection } from "./sections/OverviewSection";
import { AttendanceSection } from "./sections/AttendanceSection";
import { TasksSection } from "./sections/TasksSection";
import { PersonalTodosSection } from "./sections/PersonalTodosSection";
import { FilesSection } from "./sections/FilesSection";
import { MessagesSection } from "./sections/MessagesSection";
import { LeaveRequestsSection } from "./sections/LeaveRequestsSection";
import { UsersSection } from "./sections/UsersSection";
import { AdminSection } from "./sections/AdminSection";

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
      case "personal-todos":
        return <PersonalTodosSection />;
      case "files":
        return <FilesSection />;
      case "messages":
        return <MessagesSection />;
      case "leave-requests":
        return <LeaveRequestsSection />;
      case "users":
        return <UsersSection />;
      case "admin":
        return <AdminSection />;
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