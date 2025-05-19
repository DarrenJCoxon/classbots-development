// src/app/student/dashboard/page.tsx
'use client';

// Import our completely redesigned dashboard component
import RebuiltStudentDashboard from './rebuild';

// This component simply renders the rebuilt dashboard
export default function StudentDashboardPage() {
  return <RebuiltStudentDashboard />;
}