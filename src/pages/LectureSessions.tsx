import { Sidebar } from '@/components/layout/Sidebar';
import { PageHeader } from "@/components/layout/PageHeader";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { withAuth } from '../lib/withAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLectureSessions, useFilterOptions } from '@/hooks/useLectureSessions';
import { FilterPanel } from '@/components/LectureSessionsComponents/FilterPanel';
import { DateSelector } from '@/components/LectureSessionsComponents/DateSelector';
import { TimelineView } from '@/components/LectureSessionsComponents/TimelineView';
import { LectureSessionDetailModal } from '@/components/LectureSessionsComponents/LectureSessionDetailModal';
import { CreateSessionModal } from '@/components/LectureSessionsComponents/CreateSessionModal';
import { LectureSession } from '@/types/database';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function LectureSessions({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const [user, setUser] = useState<any>(null);
  
  // State for filters and selection
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedSemesterData, setSelectedSemesterData] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // State for modals
  const [selectedSession, setSelectedSession] = useState<LectureSession | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingSession, setEditingSession] = useState<LectureSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Fetch user profile with university info - Use limit(1) to handle RLS
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

  // Fetch lecture sessions
  const { sessions, loading: sessionsLoading, refetch } = useLectureSessions({
    sectionId: selectedSection,
    date: selectedDate,
  });

  // Fetch semester details when semester changes
  const { getSemesterById } = useFilterOptions({ universityId: user?.university_id || '' });
  
  useEffect(() => {
    if (selectedSemester) {
      getSemesterById(selectedSemester).then(data => {
        setSelectedSemesterData(data);
      });
    }
  }, [selectedSemester, getSemesterById]);

  useEffect(() => {
    if (currentPage !== 'sessions') {
      setCurrentPage('sessions');
    }
  }, [currentPage, setCurrentPage]);

  const handleSessionClick = (session: LectureSession) => {
    setSelectedSession(session);
    setShowDetailModal(true);
  };

  const handleEditSession = () => {
    if (selectedSession) {
      setEditingSession(selectedSession);
      setShowCreateModal(true);
      setShowDetailModal(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('lecture_sessions')
        .delete()
        .eq('id', selectedSession.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Special class session deleted successfully',
      });

      setShowDeleteDialog(false);
      setShowDetailModal(false);
      refetch();
    } catch (err) {
      console.error('Error deleting session:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete special class session',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateSessionSuccess = () => {
    setEditingSession(null);
    refetch();
  };

  const isFiltersComplete = selectedProgram && selectedBranch && selectedSemester && selectedSection;

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
            <div className="flex items-center justify-between">
              <PageHeader
                title="Lecture Sessions"
                description="Manage and track live classroom sessions"
                icon={<BookOpen />}
              />
              {isFiltersComplete && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-green-600 hover:bg-green-700 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Session
                </Button>
              )}
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar Panel */}
              <div className="lg:col-span-1 space-y-4">
                {/* Filter Panel */}
                <FilterPanel
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
                  <DateSelector
                    universityId={user?.university_id || ''}
                    semesterId={selectedSemester}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                  />
                )}
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                {!isFiltersComplete ? (
                  <Card className="bg-slate-800 border-slate-700 p-8 text-center">
                    <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-slate-200 font-semibold mb-2">Select Filters</h3>
                    <p className="text-slate-400">Please select Program, Branch, Year, and Section to view lecture sessions</p>
                  </Card>
                ) : (
                  <TimelineView
                    sessions={sessions}
                    date={selectedDate}
                    onSessionClick={handleSessionClick}
                    loading={sessionsLoading}
                  />
                )}
              </div>
            </div>

            {/* Help Section */}
            <Card className="bg-slate-800 border-slate-700 p-4">
              <div className="text-xs text-slate-400 space-y-1">
                <p>💡 <strong>Tips:</strong> Use the filters to select your academic section. The timeline displays all lectures for the selected date with automatic grouping by time slots.</p>
                <p>📌 Click any session card to view details including TOTP codes, attendance status, and session information.</p>
                <p>⭐ Create special sessions for makeup classes or remedial lectures directly from the Create Session button.</p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <LectureSessionDetailModal
        session={selectedSession}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onEdit={handleEditSession}
        onDelete={() => setShowDeleteDialog(true)}
      />

      {selectedSection && (
        <CreateSessionModal
          sectionId={selectedSection}
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSuccess={handleCreateSessionSuccess}
          editingSession={editingSession}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete Special Class</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this special class session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default withAuth(LectureSessions);
