import { Link, Outlet, useLocation } from 'react-router-dom';
import { Activity, LayoutDashboard, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export default function Layout() {
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
    <div className="flex h-screen w-full bg-background text-foreground">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <Activity className="h-6 w-6 text-primary mr-2" />
          <span className="font-bold text-lg">St0nks Bot</span>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-1 px-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
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

        <div className="p-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
            <span className="text-muted-foreground">API {isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-muted/20">
        <header className="h-16 border-b flex items-center px-8 bg-background shadow-sm z-10">
          <h1 className="font-semibold text-lg">
            {navItems.find(i => location.pathname.startsWith(i.path))?.name || 'Dashboard'}
          </h1>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
