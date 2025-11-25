import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { LectureSession } from '@/types/database';
import { useTOTP, getTimeRemaining } from '@/hooks/useTOTP';
import { TOTPCodeDisplay } from '@/components/TOTPCodeDisplay';
import { supabase } from '@/lib/supabase';
import {
  Clock,
  MapPin,
  User,
  BookOpen,
  Key,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Copy,
  Loader,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface LectureSessionDetailModalProps {
  session: LectureSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
}

export const LectureSessionDetailModal: React.FC<LectureSessionDetailModalProps> = ({
  session,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onCancel,
}) => {
  const { totp, loading: totpLoading, generateTOTP, toggleOTPMode } = useTOTP(
    session?.id,
    'dynamic'
  );
  const [courseData, setCourseData] = useState<any>(null);
  const [loadingCourseData, setLoadingCourseData] = useState(false);

  // Lazy load course data when modal opens
  useEffect(() => {
    if (open && session && !courseData) {
      loadCourseDetails();
    }
  }, [open, session?.id]);

  const loadCourseDetails = async () => {
    if (!session?.timetable_id) return;
    
    setLoadingCourseData(true);
    try {
      console.log('📍 Loading course details for timetable:', session.timetable_id);
      console.log('📍 Session data:', session);

      // Fetch timetable data
      const { data: timetable, error: ttError } = await supabase
        .from('timetables')
        .select('*')
        .eq('id', session.timetable_id)
        .single();

      if (ttError) {
        console.error('❌ Timetable fetch error:', ttError);
        throw ttError;
      }

      console.log('✅ Timetable loaded:', timetable);
      console.log('   - instructor_id:', timetable?.instructor_id);
      console.log('   - course_id:', timetable?.course_id);
      console.log('   - room_id:', timetable?.room_id);

      // Fetch course details separately
      let courseDetail = null;
      if (timetable?.course_id) {
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', timetable.course_id)
          .single();
        
        if (courseError) {
          console.error('❌ Course fetch error:', courseError);
        } else {
          console.log('✅ Course loaded:', course?.name);
          courseDetail = course;
        }
      } else {
        console.log('⏭️  No course_id in timetable');
      }

      // Fetch room details separately
      let roomDetail = null;
      if (timetable?.room_id) {
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('*, buildings(*)')
          .eq('id', timetable.room_id)
          .single();
        
        if (roomError) {
          console.error('❌ Room fetch error:', roomError);
        } else {
          console.log('✅ Room loaded:', room?.room_name);
          roomDetail = room;
        }
      } else {
        console.log('⏭️  No room_id in timetable');
      }

      // Fetch instructor details separately
      let instructorDetails = null;
      if (timetable?.instructor_ids && Array.isArray(timetable.instructor_ids) && timetable.instructor_ids.length > 0) {
        console.log('🔍 Fetching instructors with IDs:', timetable.instructor_ids);
        
        // Fetch from instructors table (not users table)
        const { data: instructors, error: instructorError } = await supabase
          .from('instructors')
          .select('id, code, name, email, phone, department, bio')
          .in('id', timetable.instructor_ids);
        
        if (instructorError) {
          console.error('❌ Instructors fetch error:', instructorError);
          console.error('   Query details - IDs:', timetable.instructor_ids);
          console.error('   Error code:', instructorError.code);
          console.error('   Error message:', instructorError.message);
        } else {
          console.log('✅ Instructors loaded:', instructors?.length || 0, 'instructors');
          if (!instructors || instructors.length === 0) {
            console.warn('⚠️  Query returned 0 results. Possible causes:');
            console.warn('   1. RLS policy is blocking access');
            console.warn('   2. Instructor IDs do not exist in instructors table');
          }
          instructors?.forEach((inst, idx) => {
            console.log(`   [${idx}] ${inst.name} (${(inst as any).code}) - ${inst.email}`);
          });
          instructorDetails = instructors;
        }
      } else {
        console.log('⏭️  No instructor_ids in timetable or empty array');
      }

      // Combine all data
      const enrichedData = {
        ...timetable,
        courses: courseDetail,
        rooms: roomDetail,
        users: instructorDetails,
      };

      console.log('✅ Course details loaded:', {
        has_course: !!courseDetail,
        has_room: !!roomDetail,
        has_instructors: instructorDetails && instructorDetails.length > 0,
        instructor_count: instructorDetails?.length || 0,
      });
      console.log('   enrichedData.users:', enrichedData.users);

      setCourseData(enrichedData);
    } catch (err) {
      console.error('❌ Error loading course details:', err);
    } finally {
      setLoadingCourseData(false);
    }
  };

  const handleToggleMode = async (checked: boolean) => {
    const newMode = checked ? 'dynamic' : 'static';
    await toggleOTPMode(newMode);
    toast({
      title: 'Mode Updated',
      description: `OTP mode changed to ${newMode}`,
    });
  };

  if (!session) return null;

  // Use loaded course data or fallback to session.timetables
  const timetable = courseData || (session.timetables as any);
  const course = timetable?.courses as any;
  const room = timetable?.rooms as any;
  const building = room?.buildings as any;
  const instructor = timetable?.users as any;

  // Log instructor data for debugging
  console.log('🎓 Render - Instructor Card Debug:', {
    has_courseData: !!courseData,
    timetable_id: timetable?.id,
    instructors_exist: Array.isArray(instructor) && instructor.length > 0,
    instructor_count: Array.isArray(instructor) ? instructor.length : 0,
    instructor_data: instructor,
    timetable_keys: Object.keys(timetable || {}),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900 text-green-200';
      case 'completed':
        return 'bg-blue-900 text-blue-200';
      case 'cancelled':
        return 'bg-red-900 text-red-200';
      case 'scheduled':
        return 'bg-purple-900 text-purple-200';
      case 'rescheduled':
        return 'bg-amber-900 text-amber-200';
      default:
        return 'bg-slate-900 text-slate-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-slate-850 to-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-slate-800 to-slate-850 -mx-6 -mt-6 px-6 py-4 border-b border-slate-700 rounded-t-lg">
          <DialogTitle>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                  !session.is_cancelled
                    ? 'bg-emerald-900/40 text-emerald-400' 
                    : 'bg-red-900/40 text-red-400'
                }`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-slate-100 text-xl font-semibold">
                    {loadingCourseData ? 'Loading...' : (course?.name || 'Session Details')}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">{course?.code || 'Loading course info...'}</p>
                </div>
              </div>
              <Badge className={`text-xs whitespace-nowrap flex-shrink-0 ${getStatusColor(!session.is_cancelled)}`}>
                {session.is_cancelled ? 'Cancelled' : session.is_special_class ? 'Special Class' : 'Active'}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Lecture session details including timing, location, instructors, and TOTP information
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-slate-700">
            <TabsTrigger value="details" className="text-slate-300">
              Details
            </TabsTrigger>
            <TabsTrigger value="totp" className="text-slate-300">
              TOTP
            </TabsTrigger>
            <TabsTrigger value="attendance" className="text-slate-300">
              Attendance
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            {loadingCourseData ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="bg-slate-800 border-slate-700 animate-pulse">
                    <CardHeader className="pb-3">
                      <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-700 rounded"></div>
                        <div className="h-3 bg-slate-700 rounded w-5/6"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* First Row: Time & Location */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Time */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        Date & Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Scheduled Date</p>
                          <p className="text-slate-100 font-semibold">
                            {format(new Date(session.session_date), 'PPP')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Time Slot</p>
                          <p className="text-slate-100 font-semibold">
                            {timetable?.start_time} - {timetable?.end_time}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Room */}
                  {room && (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-400" />
                          Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">Room</p>
                            <p className="text-slate-100 font-semibold">
                              {room.room_name || room.room_number}
                            </p>
                          </div>
                          {building && (
                            <div>
                              <p className="text-xs text-slate-500">Building</p>
                              <p className="text-slate-100 font-semibold">{building.name}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Second Row: Instructor & Course Info */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Instructors */}
                  {instructor && Array.isArray(instructor) && instructor.length > 0 && (
                    <Card className="bg-gradient-to-br from-emerald-900/40 to-emerald-950/40 border-emerald-700/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-emerald-300 flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-400" />
                          Instructors ({instructor.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {instructor.map((inst: any, idx: number) => (
                            <div key={inst.id || idx} className="pb-4">
                              {/* Instructor Code Badge */}
                              {(inst as any).code && (
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="bg-emerald-900/50 border-emerald-700 text-emerald-200 text-xs font-mono">
                                    {(inst as any).code}
                                  </Badge>
                                </div>
                              )}
                              
                              {/* Instructor Name */}
                              <p className="text-emerald-100 font-semibold text-sm">{inst.full_name}</p>
                              
                              {/* Email */}
                              {inst.email && (
                                <p className="text-emerald-100 text-xs font-mono text-emerald-400/80 mt-1">{inst.email}</p>
                              )}
                              
                              {/* Department */}
                              {(inst as any).department && (
                                <p className="text-emerald-100/60 text-xs mt-1">{(inst as any).department}</p>
                              )}
                              
                              {/* Divider */}
                              {idx < instructor.length - 1 && <div className="mt-4 pt-4 border-t border-emerald-700/30"></div>}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Course Info */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-cyan-400" />
                        Course Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Type</p>
                          <p className="text-slate-100 font-semibold capitalize">
                            {course?.course_type || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Credits</p>
                          <p className="text-slate-100 font-semibold">{course?.credit_hours || 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Notes/Special Class */}
            {session.notes && (
              <Card className="bg-amber-950 border-amber-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-amber-100">📌 Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-200">{session.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TOTP Tab */}
          <TabsContent value="totp" className="space-y-4">
            {loadingCourseData ? (
              <Card className="bg-slate-800 border-slate-700 animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-10 bg-slate-700 rounded"></div>
                    <div className="h-2 bg-slate-700 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* TOTP Mode Toggle */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-slate-300 flex items-center justify-between">
                      <span>OTP Generation Mode</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-100">
                            {totp?.mode === 'dynamic' ? 'Dynamic Mode (Auto-Refresh)' : 'Static Mode'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {totp?.mode === 'dynamic'
                              ? 'TOTP code refreshes every 30 seconds automatically'
                              : 'TOTP code generated once, manually refresh if needed'}
                          </p>
                        </div>
                        <Switch
                          checked={totp?.mode === 'dynamic'}
                          onCheckedChange={handleToggleMode}
                          className="ml-4"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Live TOTP Code Display */}
                {totp ? (
                  <TOTPCodeDisplay
                    code={totp.code}
                    timeRemaining={totp.timeRemaining}
                    progress={totp.timeRemaining ? (totp.timeRemaining / 30) * 100 : 0}
                    isRefreshing={totp.isRefreshing}
                    mode={totp.mode}
                    onRefresh={generateTOTP}
                    isExpiringSoon={totp.timeRemaining <= 5}
                  />
                ) : (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="pt-6">
                      <div className="text-center space-y-3">
                        <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
                        <p className="text-slate-300">TOTP not yet generated for this session</p>
                        <Button
                          onClick={generateTOTP}
                          disabled={totpLoading}
                          className="bg-cyan-600 hover:bg-cyan-700"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          Generate TOTP Code
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Generation Info */}
                {totp && (
                  <Card className="bg-slate-800/60 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs text-slate-400">Generation Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                        <span className="text-slate-400">Generated At:</span>
                        <span className="text-slate-100 font-mono">
                          {format(new Date(totp.generatedAt), 'HH:mm:ss')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                        <span className="text-slate-400">Expires At:</span>
                        <span className="text-slate-100 font-mono">
                          {format(new Date(totp.expiresAt), 'HH:mm:ss')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                        <span className="text-slate-400">Current Mode:</span>
                        <Badge className={`text-xs ${
                          totp.mode === 'dynamic'
                            ? 'bg-cyan-900 text-cyan-200'
                            : 'bg-blue-900 text-blue-200'
                        }`}>
                          {totp.mode === 'dynamic' ? '🔄 Dynamic' : '🔒 Static'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Instructions */}
                <Card className="bg-emerald-950/30 border-emerald-700/50">
                  <CardContent className="pt-6 space-y-2 text-xs text-emerald-200">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">💡</span>
                      <div>
                        <p className="font-semibold">How to use TOTP:</p>
                        <ul className="list-disc list-inside space-y-1 mt-1 text-emerald-200/80">
                          <li>Share this code with students for attendance marking</li>
                          <li>Code automatically refreshes every 30 seconds (dynamic mode)</li>
                          <li>Student submits this code to record their attendance</li>
                          <li>Each code can only be used once and is time-bound</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4">
            {loadingCourseData ? (
              <Card className="bg-slate-800 border-slate-700 animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-12 bg-slate-700 rounded"></div>
                    <div className="h-12 bg-slate-700 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-300">Attendance Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded">
                    <div className="flex items-center gap-2">
                      {!session.is_cancelled ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-slate-600" />
                      )}
                      <span className="text-slate-300">Session Status</span>
                    </div>
                    <Badge
                      className={!session.is_cancelled ? 'bg-green-900 text-green-200' : 'bg-red-700'}
                    >
                      {session.is_cancelled ? 'CANCELLED' : 'ACTIVE'}
                    </Badge>
                  </div>

                  {session.is_special_class && (
                    <div className="p-3 bg-blue-900/30 rounded text-sm border border-blue-700">
                      <p className="text-blue-300">This is a special/makeup class</p>
                      <p className="text-slate-100 font-semibold">
                        {format(new Date(session.attendance_close_time), 'HH:mm:ss')}
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-slate-900 rounded text-sm">
                    <p className="text-slate-400">Max Late Minutes</p>
                    <p className="text-slate-100 font-semibold">{session.max_late_minutes} minutes</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="space-x-2">
          {/* Edit and Delete buttons - only for special classes */}
          {session?.is_special_class && (
            <>
              {onEdit && (
                <Button 
                  onClick={onEdit} 
                  className="bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500 text-cyan-300 hover:text-cyan-200"
                >
                  Edit Session
                </Button>
              )}
              {onDelete && (
                <Button 
                  onClick={onDelete}
                  className="bg-red-600/20 hover:bg-red-600/30 border border-red-500 text-red-300 hover:text-red-200"
                >
                  Delete Session
                </Button>
              )}
            </>
          )}
          {onCancel && !session?.is_special_class && (
            <Button onClick={onCancel} variant="destructive">
              Cancel Session
            </Button>
          )}
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-slate-700"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
