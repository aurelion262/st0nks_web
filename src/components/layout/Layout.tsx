import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const { data: isOnline } = useQuery({
    queryKey: ['ping'],
    queryFn: async () => {
      try {
        await apiClient.get('/profiles');
        return true;
      } catch {
        return false;
      }
    },
    refetchInterval: 10000,
  });

  const navItems = [
    { name: 'Profiles', path: '/profiles', icon: LayoutDashboard },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground relative">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-64 border-r bg-card flex flex-col transform transition-transform duration-200 ease-in-out h-full",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b shrink-0">
          <div className="flex items-center">
            <Activity className="h-6 w-6 text-primary mr-2" />
            <span className="font-bold text-lg">St0nks Bot</span>
          </div>
          <button className="md:hidden p-1" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-1 px-4 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                location.pathname.startsWith(item.path)
                  ? "bg-primary text-primary-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
            <span className="text-muted-foreground">API {isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-muted/20">
        <header className="h-16 border-b flex items-center px-4 md:px-8 bg-background shadow-sm z-10 shrink-0">
          <button className="md:hidden mr-4 p-2 -ml-2 rounded-md hover:bg-muted" onClick={() => setIsMobileMenuOpen(true)}>
             <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-lg truncate">
            {navItems.find(i => location.pathname.startsWith(i.path))?.name || 'Dashboard'}
          </h1>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
