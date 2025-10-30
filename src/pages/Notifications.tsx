import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/layout/Navbar";
import { PageHeader } from "@/components/layout/PageHeader";
import { 
  Bell, 
  Check, 
  X, 
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Users,
  Calendar,
  BookOpen,
  Settings,
  Trash2,
  CheckCheck,
  Filter
} from "lucide-react";
import { supabase } from '../lib/supabase';
import { toast } from '@/hooks/use-toast';
import { withAuth } from '../lib/withAuth';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: 'attendance' | 'system' | 'announcement' | 'reminder';
  read: boolean;
  timestamp: string;
  action_url?: string;
}

function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Low attendance alert',
      message: 'CS-A1 section has 68% attendance this week',
      type: 'warning',
      category: 'attendance',
      read: false,
      timestamp: '2 min ago',
    },
    {
      id: '2',
      title: 'New timetable uploaded',
      message: 'Updated timetable for Computer Science 101 has been uploaded',
      type: 'info',
      category: 'announcement',
      read: false,
      timestamp: '1 hour ago',
    },
    {
      id: '3',
      title: 'System maintenance scheduled',
      message: 'ATMA will be under maintenance on Sept 15, 2:00 AM - 4:00 AM',
      type: 'info',
      category: 'system',
      read: true,
      timestamp: '3 hours ago',
    },
    {
      id: '4',
      title: 'Attendance report ready',
      message: 'Monthly attendance report for August is now available',
      type: 'success',
      category: 'attendance',
      read: true,
      timestamp: '1 day ago',
    },
    {
      id: '5',
      title: 'Session reminder',
      message: 'Computer Science 101 starts in 30 minutes - Room A-201',
      type: 'info',
      category: 'reminder',
      read: false,
      timestamp: '2 days ago',
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'unread' | 'attendance' | 'system' | 'announcement' | 'reminder'>('all');
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.category === filter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <Info className="h-4 w-4 text-info" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'attendance':
        return <Users className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'announcement':
        return <Bell className="h-4 w-4" />;
      case 'reminder':
        return <Clock className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'warning':
        return 'destructive';
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    toast({
      title: "Success",
      description: "All notifications marked as read",
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    toast({
      title: "Deleted",
      description: "Notification removed",
    });
  };

  const clearAll = () => {
    setNotifications([]);
    toast({
      title: "Cleared",
      description: "All notifications cleared",
    });
  };

  return (
    <div className="min-h-screen dark bg-background">
      <Navbar showProfileMenu />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Notifications"
          description={`You have ${unreadCount} unread notifications`}
        />

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilter('all')}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  All ({notifications.length})
                </Button>
                <Button
                  variant={filter === 'unread' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilter('unread')}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Unread ({unreadCount})
                </Button>
                <Separator />
                <Button
                  variant={filter === 'attendance' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilter('attendance')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Attendance ({notifications.filter(n => n.category === 'attendance').length})
                </Button>
                <Button
                  variant={filter === 'system' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilter('system')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  System ({notifications.filter(n => n.category === 'system').length})
                </Button>
                <Button
                  variant={filter === 'announcement' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilter('announcement')}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Announcements ({notifications.filter(n => n.category === 'announcement').length})
                </Button>
                <Button
                  variant={filter === 'reminder' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilter('reminder')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Reminders ({notifications.filter(n => n.category === 'reminder').length})
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={clearAll}
                  disabled={notifications.length === 0}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications List */}
          <motion.div
            className="lg:col-span-3 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                    <p className="text-muted-foreground">
                      {filter === 'unread' 
                        ? "You're all caught up! No unread notifications."
                        : "No notifications found for the selected filter."
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className={`transition-all hover:shadow-md ${!notification.read ? 'border-l-4 border-l-primary bg-muted/30' : ''}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="flex-shrink-0 mt-1">
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.title}
                              </h3>
                              <div className="flex items-center space-x-1">
                                {getCategoryIcon(notification.category)}
                                <Badge variant={getBadgeVariant(notification.type)} className="text-xs">
                                  {notification.category}
                                </Badge>
                              </div>
                            </div>
                            <p className={`text-sm ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {notification.timestamp}
                              </span>
                              {!notification.read && (
                                <Badge variant="outline" className="text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(Notifications);
