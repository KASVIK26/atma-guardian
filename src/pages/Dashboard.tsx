import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/layout/Navbar";
import { PageHeader } from "@/components/layout/PageHeader";
import University from "./University";
import BuildingsRooms from "./BuildingsRooms"; 
import AttendanceRecords from "./AttendanceRecords";
import LectureSessions from "./LectureSessions";
import UsersManagement from "./UsersManagement";
import {
  Users,
  GraduationCap,
  Clock,
  TrendingUp,
  Plus,
  Calendar,
  MapPin,
  Bell,
  Activity,
  BookOpen,
  UserCheck,
  AlertTriangle,
  ChevronRight,
  Building2,
  School,
  Settings,
  BarChart3,
  FileText,
  UserCog,
  Shield,
  Database,
  Wifi,
  Camera,
  Menu,
  X
} from "lucide-react";
import { withAuth } from '../lib/withAuth';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { supabase } from '../lib/supabase';

function Dashboard({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const [timeOfDay] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  });

  const [liveStats, setLiveStats] = useState({
    totalStudents: 0,
    activeTeachers: 0,
    liveSessions: 0,
    attendanceRate: 0,
    presentToday: 0,
    absent: 0,
    late: 0
  });

  const [profile, setProfile] = useState(null);
  const [universityCode, setUniversityCode] = useState('');
  
  useEffect(() => {
    // Ensure the current page is set to dashboard when this component mounts
    if (currentPage !== 'dashboard') {
      setCurrentPage('dashboard');
    }
    
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from('users')
          .select('full_name, university_id')
          .single()
          .then(({ data: profileData }) => {
            setProfile(profileData);
            if (profileData?.university_id) {
              supabase
                .from('universities')
                .select('code')
                .eq('id', profileData.university_id)
                .single()
                .then(({ data: uniData }) => {
                  setUniversityCode(uniData?.code || '');
                });
            }
          });
      }
    });
  }, [currentPage, setCurrentPage]);

  const navigate = useNavigate();

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false); // Close on mobile
      } else {
        setSidebarOpen(true); // Open on desktop
      }
    };

    // Set initial state based on screen size
    if (typeof window !== 'undefined') {
      handleResize();
      
      // Add event listener
      window.addEventListener('resize', handleResize);
      
      // Cleanup
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const sidebarItemsLocal = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: BarChart3,
      description: "Overview & Analytics",
      route: "/dashboard"
    },
    {
      id: "university",
      title: "Your University",
      icon: School,
      description: "University Settings & Info",
      route: "/university"
    },
    {
      id: "buildings",
      title: "Buildings & Rooms",
      icon: Building2,
      description: "Campus Infrastructure",
      route: "/buildings"
    },
    {
      id: "users",
      title: "Users Management",
      icon: UserCog,
      description: "Students, Teachers & Admins",
      route: "/users"
    },
    {
      id: "programs",
      title: "Academic Programs",
      icon: GraduationCap,
      description: "Programs, Branches & Sections",
      route: "/programs"
    },
    {
      id: "sessions",
      title: "Lecture Sessions",
      icon: Clock,
      description: "Live & Scheduled Sessions",
      route: "/sessions"
    },
    {
      id: "attendance",
      title: "Attendance Records",
      icon: UserCheck,
      description: "Attendance Analytics",
      route: "/attendance"
    },
    {
      id: "calendar",
      title: "Academic Calendar",
      icon: Calendar,
      description: "Events & Holidays",
      route: "/calendar"
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: Bell,
      description: "System Alerts & Messages",
      route: "/notifications"
    },
    {
      id: "security",
      title: "Security & Audit",
      icon: Shield,
      description: "Security Logs & TOTP",
      route: "/security"
    },
    {
      id: "sensors",
      title: "Sensor Data",
      icon: Wifi,
      description: "IoT & Geofencing Data",
      route: "/sensors"
    },
    {
      id: "reports",
      title: "Reports & Analytics",
      icon: FileText,
      description: "Generate Reports",
      route: "/reports"
    },
    {
      id: "settings",
      title: "System Settings",
      icon: Settings,
      description: "Configuration & Preferences",
      route: "/settings"
    }
  ];

  // Function to get background gradient styles based on color
  const getBackgroundStyle = (color: string) => {
    const colorMap: Record<string, string> = {
      primary: 'hsl(260 30% 35%)', // Deep purple
      secondary: 'hsl(280 15% 50%)', // Purple-gray  
      success: 'hsl(160 50% 45%)', // Deep emerald
      accent: 'hsl(270 50% 60%)', // Bright purple
      warning: 'hsl(45 85% 55%)', // Rich amber
      destructive: 'hsl(0 65% 50%)' // Deep crimson
    };
    
    const glowMap: Record<string, string> = {
      primary: 'hsl(260 40% 55%)', // Lighter purple glow
      secondary: 'hsl(280 20% 65%)', // Lighter purple-gray glow
      success: 'hsl(160 60% 55%)', // Brighter emerald glow
      accent: 'hsl(270 60% 75%)', // Lighter purple glow
      warning: 'hsl(45 90% 65%)', // Lighter amber glow
      destructive: 'hsl(0 70% 60%)' // Brighter red glow
    };
    
    const baseColor = colorMap[color] || colorMap.primary;
    const glowColor = glowMap[color] || glowMap.primary;
    return {
      background: `linear-gradient(135deg, ${baseColor}, ${glowColor})`
    };
  };

  const stats = [
    {
      title: "Total Students",
      value: liveStats.totalStudents.toLocaleString(),
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "primary"
    },
    {
      title: "Active Teachers",
      value: liveStats.activeTeachers.toString(),
      change: "+3%", 
      trend: "up",
      icon: GraduationCap,
      color: "success"
    },
    {
      title: "Live Sessions",
      value: liveStats.liveSessions.toString(),
      change: "Now",
      trend: "neutral",
      icon: Activity,
      color: "warning"
    },
    {
      title: "Attendance Rate",
      value: `${liveStats.attendanceRate.toFixed(1)}%`,
      change: "+2.1%",
      trend: "up", 
      icon: TrendingUp,
      color: "accent"
    }
  ];

  const quickActions = [
    {
      title: "Add New Section",
      description: "Create a new class section",
      icon: Plus,
      action: "create-section",
      color: "primary"
    },
    {
      title: "Upload Timetable", 
      description: "Import class schedules",
      icon: Calendar,
      action: "upload-timetable",
      color: "secondary"
    },
    {
      title: "Start Session",
      description: "Begin attendance tracking",
      icon: Clock,
      action: "start-session", 
      color: "success"
    },
    {
      title: "Manage Classrooms",
      description: "Edit geofencing zones",
      icon: MapPin,
      action: "manage-rooms",
      color: "accent"
    }
  ];

  const recentSessions = [
    {
      id: 1,
      subject: "Computer Science 101",
      section: "CS-A1",
      time: "9:00 AM - 10:30 AM",
      attendance: 89,
      total: 95,
      status: "completed"
    },
    {
      id: 2,
      subject: "Data Structures",
      section: "CS-B2", 
      time: "11:00 AM - 12:30 PM",
      attendance: 42,
      total: 48,
      status: "live"
    },
    {
      id: 3,
      subject: "Database Systems",
      section: "CS-A2",
      time: "2:00 PM - 3:30 PM",
      attendance: 0,
      total: 52,
      status: "upcoming"
    }
  ];

  const notifications = [
    {
      id: 1,
      title: "Low attendance alert",
      message: "CS-B1 section has 68% attendance this week",
      type: "warning",
      time: "2 min ago"
    },
    {
      id: 2,
      title: "New teacher onboarded",
      message: "Dr. Michael Chen joined Computer Science department",
      type: "success", 
      time: "1 hour ago"
    },
    {
      id: 3,
      title: "System maintenance",
      message: "Scheduled maintenance tonight at 11 PM",
      type: "info",
      time: "3 hours ago"
    }
  ];

  const renderPageContent = () => {
    switch (currentPage) {
      case "university":
        return <University sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />;
      case "buildings":
        return <BuildingsRooms sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />;
      case "attendance":
        return <AttendanceRecords sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />;
      case "sessions":
        return <LectureSessions sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />;
      case "users":
        return <UsersManagement sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />;
      case "programs":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Academic Programs</CardTitle>
              <CardDescription>Manage programs, branches, and sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">15</div>
                    <div className="text-sm text-muted-foreground">Active Programs</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">42</div>
                    <div className="text-sm text-muted-foreground">Branches</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">186</div>
                    <div className="text-sm text-muted-foreground">Sections</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        );
      case "calendar":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Academic Calendar</CardTitle>
              <CardDescription>University events, holidays, and important dates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Academic Calendar</h3>
                <p className="text-muted-foreground">Calendar integration coming soon</p>
              </div>
            </CardContent>
          </Card>
        );
      case "notifications":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Notifications Center</CardTitle>
              <CardDescription>Manage system notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Notification System</h3>
                <p className="text-muted-foreground">Advanced notification management coming soon</p>
              </div>
            </CardContent>
          </Card>
        );
      case "security":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Security & Audit</CardTitle>
              <CardDescription>Security logs, TOTP management, and audit trails</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Security Dashboard</h3>
                <p className="text-muted-foreground">Security monitoring coming soon</p>
              </div>
            </CardContent>
          </Card>
        );
      case "sensors":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Sensor Data</CardTitle>
              <CardDescription>IoT sensors, geofencing, and environmental data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Wifi className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sensor Network</h3>
                <p className="text-muted-foreground">Sensor data analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        );
      case "reports":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <CardDescription>Generate attendance reports and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Reports Dashboard</h3>
                <p className="text-muted-foreground">Advanced reporting coming soon</p>
              </div>
            </CardContent>
          </Card>
        );
      case "settings":
        return (
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure system preferences and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">System Configuration</h3>
                <p className="text-muted-foreground">Settings panel coming soon</p>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen dark bg-background flex">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        sidebarItems={sidebarItems}
      />
      {/* Overlay - only on mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'} overflow-hidden`}>
        <Navbar showProfileMenu />
        
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {currentPage === "dashboard" ? (
              <>
                {/* Header */}
                <PageHeader
                  customGreeting={`Good ${timeOfDay}`}
                  userName={profile?.full_name?.split(' ')[0] || 'User'}
                  timeOfDay={timeOfDay as "morning" | "afternoon" | "evening"}
                  description={`Here's what's happening at ${universityCode ? universityCode : 'your university'} today.`}
                />

              {/* Stats Cards */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                variants={{
                  animate: { transition: { staggerChildren: 0.1 } }
                }}
                initial="initial"
                animate="animate"
              >
                {stats.map((stat, index) => (
                  <motion.div key={index} variants={fadeInUp}>
                    <Card className="bg-gradient-card border-border/50 hover:border-primary/50 transition-all duration-300 group">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </CardTitle>
                        <div 
                          className="w-8 h-8 rounded-md flex items-center justify-center group-hover:scale-110 transition-transform"
                          style={getBackgroundStyle(stat.color)}
                        >
                          <stat.icon className="h-4 w-4 text-white" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-1">{stat.value}</div>
                        <div className="flex items-center text-xs">
                          <Badge 
                            variant={stat.trend === "up" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {stat.change}
                          </Badge>
                          <span className="text-muted-foreground ml-2">from last week</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Quick Actions */}
                  <motion.div {...fadeInUp}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Plus className="w-5 h-5 mr-2 text-primary" />
                          Quick Actions
                        </CardTitle>
                        <CardDescription>
                          Common tasks to manage your attendance system
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quickActions.map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="h-auto p-4 justify-start hover:border-primary/50 group"
                          >
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform"
                              style={getBackgroundStyle(action.color)}
                            >
                              <action.icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{action.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {action.description}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Recent Sessions */}
                  <motion.div {...fadeInUp}>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center">
                              <Clock className="w-5 h-5 mr-2 text-primary" />
                              Today's Schedule
                            </CardTitle>
                            <CardDescription>
                              Attendance sessions for today
                            </CardDescription>
                          </div>
                          <Button variant="outline" size="sm">
                            View All
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {recentSessions.map((session) => (
                          <div 
                            key={session.id}
                            className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                                <BookOpen className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <div className="font-medium">{session.subject}</div>
                                <div className="text-sm text-muted-foreground">
                                  {session.section} • {session.time}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {session.attendance}/{session.total}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {Math.round((session.attendance / session.total) * 100)}% present
                                </div>
                              </div>
                              <Badge 
                                variant={
                                  session.status === "live" ? "default" :
                                  session.status === "completed" ? "secondary" : "outline"
                                }
                                className="capitalize"
                              >
                                {session.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Weekly Progress */}
                  <motion.div {...fadeInUp}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Weekly Progress</CardTitle>
                        <CardDescription>
                          Attendance tracking overview
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Overall Attendance</span>
                            <span className="font-medium">{liveStats.attendanceRate.toFixed(1)}%</span>
                          </div>
                          <Progress value={liveStats.attendanceRate} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Sessions Completed</span>
                            <span className="font-medium">142/156</span>
                          </div>
                          <Progress value={91} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Teacher Participation</span>
                            <span className="font-medium">94.2%</span>
                          </div>
                          <Progress value={94.2} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Notifications */}
                  <motion.div {...fadeInUp}>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center text-lg">
                            <Bell className="w-5 h-5 mr-2 text-primary" />
                            Notifications
                          </CardTitle>
                          <Badge variant="secondary">3</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {notifications.map((notification) => (
                          <div 
                            key={notification.id}
                            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                          >
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              notification.type === "warning" ? "bg-warning" :
                              notification.type === "success" ? "bg-success" :
                              "bg-primary"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {notification.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {notification.message}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {notification.time}
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Quick Stats */}
                  <motion.div {...fadeInUp}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Quick Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <UserCheck className="w-4 h-4 text-success" />
                            <span className="text-sm">Present Today</span>
                          </div>
                          <span className="font-medium">{liveStats.presentToday.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-warning" />
                            <span className="text-sm">Absent</span>
                          </div>
                          <span className="font-medium">{liveStats.absent}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">Late</span>
                          </div>
                          <span className="font-medium">{liveStats.late}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
              </>
            ) : (
              renderPageContent()
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default withAuth(Dashboard);