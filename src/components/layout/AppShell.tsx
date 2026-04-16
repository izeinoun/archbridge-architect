import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import CreateProjectModal from '@/components/projects/CreateProjectModal';

export default function AppShell() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar onCreateProject={() => setShowCreate(true)} />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
