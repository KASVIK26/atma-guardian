import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  GraduationCap, 
  Shield, 
  Plus, 
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Calendar,
  UserCheck,
  UserX,
  Settings,
  Eye,
  Edit3,
  Trash2
} from "lucide-react";

export default function UsersManagement() {
  const userStats = [
    {
      title: "Total Students",
      value: "2,847",
      change: "+127 this month",
      icon: Users,
      color: "bg-blue-600"
    },
    {
      title: "Faculty Members", 
      value: "156",
      change: "+8 this month",
      icon: GraduationCap,
      color: "bg-green-600"
    },
    {
      title: "Administrators",
      value: "12",
      change: "No change",
      icon: Shield,
      color: "bg-purple-600"
    },
    {
      title: "Active Users",
      value: "2,891",
      change: "+134 this month",
      icon: UserCheck,
      color: "bg-orange-600"
    }
  ];

  const recentUsers = [
    {
      id: 1,
      name: "Emily Johnson",
      email: "emily.johnson@stanford.edu",
      role: "student",
      enrollmentId: "STU2024001",
      program: "Computer Science",
      year: "2nd Year",
      lastLogin: "2 hours ago",
      status: "active",
      avatar: "/api/placeholder/40/40"
    },
    {
      id: 2,
      name: "Dr. Michael Chen",
      email: "m.chen@stanford.edu", 
      role: "teacher",
      enrollmentId: "FAC2019012",
      program: "Computer Science",
      year: "Associate Professor",
      lastLogin: "1 hour ago",
      status: "active",
      avatar: "/api/placeholder/40/40"
    },
    {
      id: 3,
      name: "Sarah Williams",
      email: "sarah.w@stanford.edu",
      role: "student",
      enrollmentId: "STU2023156",
      program: "Data Science",
      year: "3rd Year", 
      lastLogin: "5 minutes ago",
      status: "active",
      avatar: "/api/placeholder/40/40"
    },
    {
      id: 4,
      name: "Prof. David Brown",
      email: "d.brown@stanford.edu",
      role: "teacher",
      enrollmentId: "FAC2020008",
      program: "Mathematics",
      year: "Professor",
      lastLogin: "30 minutes ago",
      status: "active",
      avatar: "/api/placeholder/40/40"
    },
    {
      id: 5,
      name: "Alex Rodriguez",
      email: "alex.r@stanford.edu",
      role: "admin",
      enrollmentId: "ADM2022003",
      program: "System Administration",
      year: "IT Manager",
      lastLogin: "10 minutes ago",
      status: "active",
      avatar: "/api/placeholder/40/40"
    }
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "student": return "bg-blue-100 text-blue-800";
      case "teacher": return "bg-green-100 text-green-800";
      case "admin": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "student": return Users;
      case "teacher": return GraduationCap;
      case "admin": return Shield;
      default: return Users;
    }
  };

  return (
    <div className="space-y-6">
      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.change}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common user management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-auto p-4 justify-start" variant="outline">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium">Add Student</div>
                <div className="text-xs text-muted-foreground">Register new student</div>
              </div>
            </Button>
            
            <Button className="h-auto p-4 justify-start" variant="outline">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium">Add Faculty</div>
                <div className="text-xs text-muted-foreground">Register new teacher</div>
              </div>
            </Button>
            
            <Button className="h-auto p-4 justify-start" variant="outline">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium">Add Admin</div>
                <div className="text-xs text-muted-foreground">Create administrator</div>
              </div>
            </Button>
            
            <Button className="h-auto p-4 justify-start" variant="outline">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium">Bulk Import</div>
                <div className="text-xs text-muted-foreground">Upload user data</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all system users</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search by name, email, or enrollment ID..." 
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Registration Date
            </Button>
          </div>

          {/* User List */}
          <div className="space-y-4">
            {recentUsers.map((user) => {
              const RoleIcon = getRoleIcon(user.role);
              return (
                <div key={user.id} className="border border-border/50 rounded-lg p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <div className="font-semibold">{user.name}</div>
                          <Badge className={getRoleBadgeColor(user.role)}>
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {user.role}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center space-x-4">
                          <span className="flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {user.email}
                          </span>
                          <span>ID: {user.enrollmentId}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {user.program} • {user.year} • Last login: {user.lastLogin}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Badge 
                          variant={user.status === "active" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {user.status}
                        </Badge>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role-based Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">1st Year</span>
                <span className="font-medium">782</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">2nd Year</span>
                <span className="font-medium">693</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">3rd Year</span>
                <span className="font-medium">721</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">4th Year</span>
                <span className="font-medium">651</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Faculty */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-green-600" />
              Faculty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Professors</span>
                <span className="font-medium">45</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Associate Professors</span>
                <span className="font-medium">67</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Assistant Professors</span>
                <span className="font-medium">32</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Lecturers</span>
                <span className="font-medium">12</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-purple-600" />
              System Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Active Sessions</span>
                <span className="font-medium text-green-600">1,247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pending Approvals</span>
                <span className="font-medium text-orange-600">23</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Suspended</span>
                <span className="font-medium text-red-600">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Password Resets</span>
                <span className="font-medium">156</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
