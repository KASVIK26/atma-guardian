import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from "@/components/layout/PageHeader";
import { Navbar } from "@/components/layout/Navbar";
import { Users } from "lucide-react";
import { withAuth } from '../lib/withAuth';
import { useEffect } from 'react';

function UsersManagement({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  useEffect(() => {
    if (currentPage !== 'users') {
      setCurrentPage('users');
    }
  }, [currentPage, setCurrentPage]);

  return (
    <div className="min-h-screen dark bg-background flex">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        sidebarItems={sidebarItems}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar showProfileMenu />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <PageHeader
              title="User Management"
              description="Manage students, teachers, and staff accounts"
              icon={<Users />}
            />

            <div className="flex items-center justify-center min-h-[400px]">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Upcoming</CardTitle>
                </CardHeader>
                <CardContent>
                  This feature is coming soon.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(UsersManagement);
