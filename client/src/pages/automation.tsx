import AutomationForm from "@/components/automation-form";
import ProgressMonitor from "@/components/progress-monitor";
import RecentAutomations from "@/components/recent-automations";

export default function AutomationPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AutomationForm />
        <ProgressMonitor />
      </div>
      <RecentAutomations />
    </div>
  );
}
