import { Sidebar } from '@/components/layout/Sidebar';
import { PageHeader } from "@/components/layout/PageHeader";
import { Navbar } from "@/components/layout/Navbar";
import { UserCheck } from "lucide-react";
import { withAuth } from '../lib/withAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { useAttendanceRecords, useAttendanceFilterOptions } from '@/hooks/useAttendanceRecords';
import { AttendanceFilterPanel } from '@/components/AttendanceComponents/AttendanceFilterPanel';
import { AttendanceDateSelector } from '@/components/AttendanceComponents/AttendanceDateSelector';
import { AttendanceRecordsTable } from '@/components/AttendanceComponents/AttendanceRecordsTable';

function AttendanceRecords({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const [user, setUser] = useState<any>(null);
  
  // State for filters and selection
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Fetch user profile with university info
        const { data: userDataArray, error: userError } = await supabase
          .from('users')
          .select('*, universities(*)')
          .eq('id', authUser.id)
          .limit(1);
        
        const userData = userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;
        if (userError) {
          console.error('Error fetching user profile:', userError);
        }
        setUser(userData);
      }
    };
    getCurrentUser();
  }, []);

  // Fetch attendance records
  const { records, enrolledStudents, loading, error, refetch } = useAttendanceRecords({
    sectionId: selectedSection,
    date: selectedDate,
  });

  // Fetch semester details when semester changes
  const { getSemesterById } = useAttendanceFilterOptions({ universityId: user?.university_id || '' });
  
  const [selectedSemesterData, setSelectedSemesterData] = useState<any>(null);
  useEffect(() => {
    if (selectedSemester) {
      getSemesterById(selectedSemester).then(data => {
        setSelectedSemesterData(data);
      });
    }
  }, [selectedSemester, getSemesterById]);

  useEffect(() => {
    if (currentPage !== 'attendance') {
      setCurrentPage('attendance');
    }
  }, [currentPage, setCurrentPage]);

  const isFiltersComplete = selectedProgram && selectedBranch && selectedSemester && selectedSection;

  // Get course name from records
  const courseName = records.length > 0 && records[0].courseName 
    ? records[0].courseName 
    : 'No Sessions Today';
  const courseCode = records.length > 0 && records[0].courseCode 
    ? records[0].courseCode 
    : '';

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        sidebarItems={sidebarItems}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar showProfileMenu />
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <PageHeader
              title="Attendance Records"
              description="View and manage student attendance by date and section"
              icon={<UserCheck />}
            />

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar Panel */}
              <div className="lg:col-span-1 space-y-4">
                {/* Filter Panel */}
                <AttendanceFilterPanel
                  universityId={user?.university_id || ''}
                  selectedProgram={selectedProgram}
                  selectedBranch={selectedBranch}
                  selectedSemester={selectedSemester}
                  selectedSection={selectedSection}
                  onProgramChange={setSelectedProgram}
                  onBranchChange={setSelectedBranch}
                  onSemesterChange={setSelectedSemester}
                  onSectionChange={setSelectedSection}
                />

                {/* Date Selector */}
                {isFiltersComplete && (
                  <AttendanceDateSelector
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                  />
                )}
              </div>

              {/* Main Content Panel */}
              <div className="lg:col-span-3">
                {!isFiltersComplete ? (
                  <div className="flex items-center justify-center min-h-[400px] bg-slate-900 rounded-lg border border-slate-700">
                    <div className="text-center">
                      <UserCheck className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-300 font-medium">Select filters to view attendance records</p>
                      <p className="text-slate-500 text-sm mt-1">Choose Program → Branch → Semester → Section</p>
                    </div>
                  </div>
                ) : (
                  <AttendanceRecordsTable
                    courseName={courseName}
                    courseCode={courseCode}
                    records={records}
                    enrolledStudents={enrolledStudents}
                    loading={loading}
                    error={error}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(AttendanceRecords);
