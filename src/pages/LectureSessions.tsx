import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Activity, 
  Play, 
  Square,
  Users,
  MapPin,
  BookOpen,
  Plus,
  Settings,
  Eye,
  RotateCcw,
  AlertCircle
} from "lucide-react";

export default function LectureSessions() {
  const liveSessions = [
    {
      id: 1,
      course: "Computer Science 101",
      section: "CS-A1",
      instructor: "Dr. Sarah Smith",
      room: "ENG-101",
      startTime: "9:00 AM",
      endTime: "10:30 AM",
      totalStudents: 95,
      presentStudents: 89,
      status: "live",
      duration: "45 min",
      totp: "ABC123",
      validationScore: 94.2
    },
    {
      id: 2,
      course: "Data Structures",
      section: "CS-B2", 
      instructor: "Prof. Michael Johnson",
      room: "ENG-201",
      startTime: "11:00 AM",
      endTime: "12:30 PM",
      totalStudents: 48,
      presentStudents: 42,
      status: "live",
      duration: "32 min",
      totp: "XYZ789",
      validationScore: 91.8
    }
  ];

  const upcomingSessions = [
    {
      id: 3,
      course: "Database Systems",
      section: "CS-A2",
      instructor: "Dr. Emily Williams",
      room: "SCI-301",
      startTime: "2:00 PM",
      endTime: "3:30 PM",
      totalStudents: 52,
      status: "scheduled"
    },
    {
      id: 4,
      course: "Web Development",
      section: "CS-C1",
      instructor: "Prof. David Davis",
      room: "ENG-301", 
      startTime: "3:45 PM",
      endTime: "5:15 PM",
      totalStudents: 38,
      status: "scheduled"
    }
  ];

  const completedSessions = [
    {
      id: 5,
      course: "Operating Systems",
      section: "CS-A3",
      instructor: "Dr. Lisa Brown",
      room: "ENG-401",
      startTime: "7:30 AM",
      endTime: "9:00 AM",
      totalStudents: 65,
      presentStudents: 61,
      status: "completed",
      attendanceRate: 93.8
    }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">2</div>
                <div className="text-sm text-muted-foreground">Live Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">3</div>
                <div className="text-sm text-muted-foreground">Upcoming Today</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">131</div>
                <div className="text-sm text-muted-foreground">Students Online</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">8</div>
                <div className="text-sm text-muted-foreground">Completed Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-600" />
                Live Sessions
              </CardTitle>
              <CardDescription>Currently active lecture sessions</CardDescription>
            </div>
            <Badge variant="default" className="bg-green-600">
              {liveSessions.length} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {liveSessions.map((session) => (
              <div key={session.id} className="border border-green-200 rounded-lg p-4 bg-green-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                      <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold">{session.course}</div>
                      <div className="text-sm text-muted-foreground">
                        {session.section} • {session.instructor}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {session.room} • {session.startTime} - {session.endTime}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {session.presentStudents}/{session.totalStudents}
                      </div>
                      <div className="text-xs text-muted-foreground">Present</div>
                      <div className="w-24 mt-1">
                        <Progress 
                          value={(session.presentStudents / session.totalStudents) * 100} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium">TOTP</div>
                      <div className="text-lg font-bold text-green-600">{session.totp}</div>
                      <div className="text-xs text-muted-foreground">Valid: 2:30</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-sm font-medium">Score</div>
                      <div className="text-lg font-bold">{session.validationScore}%</div>
                      <div className="text-xs text-muted-foreground">Validation</div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-3 h-3 mr-1" />
                        Monitor
                      </Button>
                      <Button variant="outline" size="sm">
                        <Square className="w-3 h-3 mr-1" />
                        End
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Upcoming Sessions
              </CardTitle>
              <CardDescription>Scheduled sessions for today</CardDescription>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Session
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="border border-border/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold">{session.course}</div>
                      <div className="text-sm text-muted-foreground">
                        {session.section} • {session.instructor}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {session.room} • {session.startTime} - {session.endTime}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-lg font-bold">{session.totalStudents}</div>
                      <div className="text-xs text-muted-foreground">Enrolled</div>
                    </div>
                    
                    <Badge variant="outline" className="min-w-[80px] justify-center">
                      Scheduled
                    </Badge>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Play className="w-3 h-3 mr-1" />
                        Start
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Completed Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-gray-600" />
            Recently Completed
          </CardTitle>
          <CardDescription>Sessions completed today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {completedSessions.map((session) => (
              <div key={session.id} className="border border-border/50 rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold">{session.course}</div>
                      <div className="text-sm text-muted-foreground">
                        {session.section} • {session.instructor}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {session.room} • {session.startTime} - {session.endTime}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {session.presentStudents}/{session.totalStudents}
                      </div>
                      <div className="text-xs text-muted-foreground">Attendance</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-lg font-bold">{session.attendanceRate}%</div>
                      <div className="text-xs text-muted-foreground">Rate</div>
                    </div>
                    
                    <Badge variant="secondary" className="min-w-[80px] justify-center">
                      Completed
                    </Badge>
                    
                    <Button variant="outline" size="sm">
                      <Eye className="w-3 h-3 mr-1" />
                      View Report
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common session management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-auto p-4 justify-start" variant="outline">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium">Create Session</div>
                <div className="text-xs text-muted-foreground">Schedule new lecture</div>
              </div>
            </Button>
            
            <Button className="h-auto p-4 justify-start" variant="outline">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <RotateCcw className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium">Bulk Import</div>
                <div className="text-xs text-muted-foreground">Upload timetable</div>
              </div>
            </Button>
            
            <Button className="h-auto p-4 justify-start" variant="outline">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium">TOTP Settings</div>
                <div className="text-xs text-muted-foreground">Configure codes</div>
              </div>
            </Button>
            
            <Button className="h-auto p-4 justify-start" variant="outline">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium">Session Alerts</div>
                <div className="text-xs text-muted-foreground">Manage notifications</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
