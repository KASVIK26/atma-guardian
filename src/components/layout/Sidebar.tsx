import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface SidebarItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentPage: string;
  setCurrentPage: (id: string) => void;
  sidebarItems: SidebarItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  currentPage,
  setCurrentPage,
  sidebarItems,
}) => {
  const navigate = useNavigate();
  return (
    <div className={`fixed inset-y-0 left-0 z-50 bg-card border-r border-border transform transition-transform duration-300 ease-in-out ${
      sidebarOpen ? 'w-64 translate-x-0' : 'w-16 translate-x-0'
    } lg:relative lg:translate-x-0`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hover:bg-muted p-2"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto scrollbar-hide">
        <div className="space-y-2">
          {sidebarItems.map((item) => (
            <Button
              key={item.id}
              variant={currentPage === item.id ? 'default' : 'ghost'}
              className={`w-full ${sidebarOpen ? 'justify-start h-auto p-3' : 'justify-center h-10 p-2'} transition-all duration-200`}
              onClick={() => {
                setCurrentPage(item.id);
                navigate(item.route);
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
              title={!sidebarOpen ? item.title : undefined}
            >
              <item.icon className={`h-4 w-4 ${sidebarOpen ? 'mr-3' : ''} flex-shrink-0`} />
              {sidebarOpen && (
                <div className="text-left flex-1">
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              )}
            </Button>
          ))}
        </div>
      </nav>
    </div>
  );
};
