import { useState } from "react";
import { DashboardLayout } from "./DashboardLayout";
import { OverviewSection } from "./sections/OverviewSection";
import { AttendanceSection } from "./sections/AttendanceSection";
import { TasksSection } from "./sections/TasksSection";
import { PersonalTodosSection } from "./sections/PersonalTodosSection";
import { FilesSection } from "./sections/FilesSection";
import { LeaveRequestsSection } from "./sections/LeaveRequestsSection";
import { UsersSection } from "./sections/UsersSection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { TeamsSection } from "./sections/TeamsSection";
import { AdminSection } from "./sections/AdminSection";
import { ProfileSection } from "./sections/ProfileSection";
import { SettingsSection } from "./sections/SettingsSection";

export function Dashboard() {
  const [activeSection, setActiveSection] = useState("overview");

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection onSectionChange={setActiveSection} />;
      case "attendance":
        return <AttendanceSection />;
      case "projects":
        return <ProjectsSection />;
      case "teams":
        return <TeamsSection />;
      case "tasks":
        return <TasksSection />;
      case "personal-todos":
        return <PersonalTodosSection />;
      case "files":
        return <FilesSection />;
      case "leave-requests":
        return <LeaveRequestsSection />;
      case "users":
        return <UsersSection />;
      case "admin":
        return <AdminSection />;
      case "profile":
        return <ProfileSection />;
      case "settings":
        return <SettingsSection />;
      default:
        return <OverviewSection onSectionChange={setActiveSection} />;
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