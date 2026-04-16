import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Home, FileText, Lightbulb, MessageSquare, MoreHorizontal, GitGraph, FileOutput, Clock, Settings, Bell, Search, BarChart3 } from 'lucide-react';

const PRIMARY_TABS = [
  { path: '/projects', label: 'Projects', icon: Home, match: '/projects' },
  { path: 'documents', label: 'Docs', icon: FileText, isProjectTab: true },
  { path: '', label: 'Insights', icon: Lightbulb, isProjectTab: true },
  { path: 'chat', label: 'Chat', icon: MessageSquare, isProjectTab: true },
];

const MORE_ITEMS = [
  { path: 'generated', label: 'Generated Docs', icon: FileOutput, isProjectTab: true },
  { path: 'diagrams', label: 'Diagrams', icon: GitGraph, isProjectTab: true },
  { path: 'timeline', label: 'Timeline', icon: Clock, isProjectTab: true },
  { path: 'settings', label: 'Settings', icon: Settings, isProjectTab: true },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function MobileNav() {
  const [showMore, setShowMore] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const getFullPath = (item: typeof PRIMARY_TABS[0]) => {
    if (item.isProjectTab && id) return `/projects/${id}${item.path ? '/' + item.path : ''}`;
    return item.path;
  };

  const isActive = (item: typeof PRIMARY_TABS[0]) => {
    const full = getFullPath(item);
    if (item.isProjectTab && id) {
      const basePath = `/projects/${id}`;
      const currentTab = location.pathname.replace(basePath, '').replace(/^\//, '');
      return currentTab === item.path;
    }
    return location.pathname === full || location.pathname.startsWith(full + '/');
  };

  const handleNav = (item: typeof PRIMARY_TABS[0]) => {
    navigate(getFullPath(item));
    setShowMore(false);
  };

  const inProject = !!id && location.pathname.startsWith(`/projects/${id}`);

  return (
    <>
      {/* Backdrop */}
      {showMore && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setShowMore(false)} />
      )}

      {/* Bottom Sheet for More */}
      {showMore && (
        <div className="fixed bottom-14 left-0 right-0 bg-card border-t border-border rounded-t-2xl z-50 lg:hidden pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-center py-2">
            <div className="h-1 w-8 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="px-4 pb-4 space-y-1">
            {MORE_ITEMS.filter(item => !item.isProjectTab || inProject).map(item => (
              <button
                key={item.path}
                onClick={() => handleNav(item as any)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 lg:hidden mobile-nav">
        <div className="flex items-center justify-around h-14">
          {(inProject ? PRIMARY_TABS : [PRIMARY_TABS[0]]).map(item => {
            const active = isActive(item);
            return (
              <button
                key={item.path + item.label}
                onClick={() => handleNav(item)}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] ${showMore ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
