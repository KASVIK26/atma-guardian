import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/layout/Navbar";
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
  ChevronRight
} from "lucide-react";

export default function Dashboard() {
  const [timeOfDay] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  });

  const stats = [
    {
      title: "Total Students",
      value: "2,847",
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "primary"
    },
    {
      title: "Active Teachers",
      value: "156",
      change: "+3%", 
      trend: "up",
      icon: GraduationCap,
      color: "success"
    },
    {
      title: "Live Sessions",
      value: "23",
      change: "Now",
      trend: "neutral",
      icon: Activity,
      color: "warning"
    },
    {
      title: "Attendance Rate",
      value: "87.3%",
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

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen dark bg-background">
      <Navbar showProfileMenu />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div {...fadeInUp} className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Good {timeOfDay}, Dr. Sarah! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening at Stanford University today.
          </p>
        </motion.div>

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
                  <div className={`w-8 h-8 bg-gradient-to-br from-${stat.color} to-${stat.color}-glow rounded-md flex items-center justify-center group-hover:scale-110 transition-transform`}>
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
                      <div className={`w-10 h-10 bg-gradient-to-br from-${action.color} to-${action.color}-glow rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform`}>
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
                        <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
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
                      <span className="font-medium">87.3%</span>
                    </div>
                    <Progress value={87.3} className="h-2" />
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
                    <span className="font-medium">2,483</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="text-sm">Absent</span>
                    </div>
                    <span className="font-medium">364</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Late</span>
                    </div>
                    <span className="font-medium">127</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}