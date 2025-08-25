import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  UserCheck, 
  Clock, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Users,
  FileText,
  Download,
  Filter
} from "lucide-react";

export default function AttendanceRecords() {
  const attendanceStats = [
    {
      title: "Present Today",
      value: "2,483",
      change: "+5.2%",
      icon: UserCheck,
      color: "text-green-600"
    },
    {
      title: "Absent Today", 
      value: "364",
      change: "-2.1%",
      icon: AlertTriangle,
      color: "text-red-600"
    },
    {
      title: "Late Arrivals",
      value: "127",
      change: "+0.8%",
      icon: Clock,
      color: "text-orange-600"
    },
    {
      title: "Avg. Attendance",
      value: "87.3%",
      change: "+1.5%",
      icon: TrendingUp,
      color: "text-blue-600"
    }
  ];

  const recentSessions = [
    {
      id: 1,
      course: "Computer Science 101",
      section: "CS-A1",
      instructor: "Dr. Smith",
      time: "9:00 AM - 10:30 AM",
      present: 89,
      total: 95,
      status: "completed"
    },
    {
      id: 2,
      course: "Data Structures",
      section: "CS-B2",
      instructor: "Prof. Johnson",
      time: "11:00 AM - 12:30 PM", 
      present: 42,
      total: 48,
      status: "live"
    },
    {
      id: 3,
      course: "Database Systems",
      section: "CS-A2",
      instructor: "Dr. Williams",
      time: "2:00 PM - 3:30 PM",
      present: 0,
      total: 52,
      status: "upcoming"
    },
    {
      id: 4,
      course: "Web Development",
      section: "CS-C1",
      instructor: "Prof. Davis", 
      time: "3:45 PM - 5:15 PM",
      present: 0,
      total: 38,
      status: "upcoming"
    }
  ];

  const weeklyData = [
    { day: "Mon", attendance: 85.2 },
    { day: "Tue", attendance: 88.7 },
    { day: "Wed", attendance: 84.3 },
    { day: "Thu", attendance: 89.1 },
    { day: "Fri", attendance: 82.8 },
    { day: "Sat", attendance: 91.2 },
    { day: "Sun", attendance: 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Attendance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {attendanceStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.title}</div>
                  <div className={`text-xs ${stat.color} mt-1`}>{stat.change} from yesterday</div>
                </div>
                <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Attendance Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary" />
            Weekly Attendance Trend
          </CardTitle>
          <CardDescription>Attendance percentage by day of the week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weeklyData.map((day, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-12 text-sm font-medium">{day.day}</div>
                <div className="flex-1">
                  <Progress value={day.attendance} className="h-3" />
                </div>
                <div className="w-16 text-sm font-medium text-right">
                  {day.attendance > 0 ? `${day.attendance}%` : "No Classes"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>View and manage attendance records</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <Input placeholder="Search by course, section, or instructor..." className="flex-1" />
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Date Range
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session Records */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Sessions</CardTitle>
          <CardDescription>Real-time attendance tracking for today's sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSessions.map((session) => (
              <div 
                key={session.id}
                className="border border-border/50 rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">{session.course}</div>
                      <div className="text-sm text-muted-foreground">
                        {session.section} • {session.instructor}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.time}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {session.present}/{session.total}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.total > 0 ? Math.round((session.present / session.total) * 100) : 0}% present
                      </div>
                    </div>
                    
                    <div className="w-24">
                      <Progress 
                        value={session.total > 0 ? (session.present / session.total) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                    
                    <Badge 
                      variant={
                        session.status === "live" ? "default" :
                        session.status === "completed" ? "secondary" : "outline"
                      }
                      className="capitalize min-w-[80px] justify-center"
                    >
                      {session.status}
                    </Badge>
                    
                    <Button variant="outline" size="sm">
                      <FileText className="w-3 h-3 mr-1" />
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Low Attendance Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-warning" />
            Low Attendance Alerts
          </CardTitle>
          <CardDescription>Sections with attendance below threshold</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-warning/50 rounded-lg bg-warning/5">
              <div>
                <div className="font-medium">CS-B1 - Algorithm Analysis</div>
                <div className="text-sm text-muted-foreground">Attendance: 68% (Below 75% threshold)</div>
              </div>
              <Button variant="outline" size="sm">Take Action</Button>
            </div>
            <div className="flex items-center justify-between p-3 border border-warning/50 rounded-lg bg-warning/5">
              <div>
                <div className="font-medium">MATH-C2 - Calculus II</div>
                <div className="text-sm text-muted-foreground">Attendance: 72% (Below 75% threshold)</div>
              </div>
              <Button variant="outline" size="sm">Take Action</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
