import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from "@/components/layout/PageHeader";
import { Navbar } from "@/components/layout/Navbar";
import { Users, BookOpen, Shield } from "lucide-react";
import { withAuth } from '../lib/withAuth';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function UsersManagement({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const navigate = useNavigate();

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

            {/* User Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Instructors Card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                    </div>
                    <CardTitle>Instructors</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Manage faculty members, their qualifications, and assignments.
                  </p>
                  <Button 
                    onClick={() => navigate('/instructors')}
                    className="w-full"
                  >
                    Manage Instructors
                  </Button>
                </CardContent>
              </Card>

              {/* Students Card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Users className="h-6 w-6 text-green-600 dark:text-green-300" />
                    </div>
                    <CardTitle>Students</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Manage student accounts, enrollments, and academic records.
                  </p>
                  <Button 
                    onClick={() => navigate('/manage-students')}
                    className="w-full"
                  >
                    Manage Students
                  </Button>
                </CardContent>
              </Card>

              {/* Staff Card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50 opacity-50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <Shield className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                    </div>
                    <CardTitle>Staff</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Manage administrative and support staff accounts.
                  </p>
                  <Button 
                    disabled
                    className="w-full"
                  >
                    Coming Soon
                  </Button>
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
