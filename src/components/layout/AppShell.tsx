import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import MobileNav from './MobileNav';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import SearchModal from '@/components/SearchModal';

export default function AppShell() {
  const [showCreate, setShowCreate] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block">
        <AppSidebar onCreateProject={() => setShowCreate(true)} />
      </div>
      <main className="flex-1 overflow-y-auto pb-14 lg:pb-0">
        <Outlet />
      </main>
      <MobileNav />
      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
      <SearchModal open={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
}
