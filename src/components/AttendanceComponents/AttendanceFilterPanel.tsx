import React, { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAttendanceFilterOptions } from '@/hooks/useAttendanceRecords';

interface AttendanceFilterPanelProps {
  universityId: string;
  onProgramChange: (programId: string) => void;
  onBranchChange: (branchId: string) => void;
  onSemesterChange: (semesterId: string) => void;
  onSectionChange: (sectionId: string) => void;
  selectedProgram?: string;
  selectedBranch?: string;
  selectedSemester?: string;
  selectedSection?: string;
}

export const AttendanceFilterPanel: React.FC<AttendanceFilterPanelProps> = ({
  universityId,
  onProgramChange,
  onBranchChange,
  onSemesterChange,
  onSectionChange,
  selectedProgram,
  selectedBranch,
  selectedSemester,
  selectedSection,
}) => {
  const { 
    programs, 
    branches, 
    semesters, 
    sections, 
    loading, 
    fetchBranches, 
    fetchSemesters, 
    fetchSections 
  } = useAttendanceFilterOptions({ universityId });

  // Fetch branches when program changes
  useEffect(() => {
    if (selectedProgram) {
      fetchBranches(selectedProgram);
    }
  }, [selectedProgram, fetchBranches]);

  // Fetch semesters when program changes
  useEffect(() => {
    if (selectedProgram) {
      fetchSemesters(selectedProgram);
    }
  }, [selectedProgram, fetchSemesters]);

  // Fetch sections when branch or semester changes
  useEffect(() => {
    if (selectedBranch && selectedSemester) {
      fetchSections(selectedBranch, selectedSemester);
    }
  }, [selectedBranch, selectedSemester, fetchSections]);

  return (
    <Card className="bg-slate-900 border-slate-700 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg text-slate-100">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Program Select */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">Program</label>
          <Select value={selectedProgram || ''} onValueChange={onProgramChange}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
              <SelectValue placeholder="Select a program" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {programs.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  No programs available
                </SelectItem>
              ) : (
                programs.map((program: any) => (
                  <SelectItem key={program.id} value={program.id}>
                    <span className="text-slate-100">{program.name}</span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Branch Select */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            Branch
            {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
          </label>
          <Select
            value={selectedBranch || ''}
            onValueChange={onBranchChange}
            disabled={!selectedProgram || branches.length === 0}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 disabled:opacity-50">
              <SelectValue placeholder="Select a branch" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {branches.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  {!selectedProgram ? 'Select a program first' : 'No branches available'}
                </SelectItem>
              ) : (
                branches.map((branch: any) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    <span className="text-slate-100">{branch.name}</span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Semester Select */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            Semester
            {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
          </label>
          <Select value={selectedSemester || ''} onValueChange={onSemesterChange}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {semesters.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  {!selectedProgram ? 'Select a program first' : 'No semesters available'}
                </SelectItem>
              ) : (
                semesters.map((semester: any) => (
                  <SelectItem key={semester.id} value={semester.id}>
                    <span className="text-slate-100">{semester.name}</span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Section Select */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            Section
            {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
          </label>
          <Select
            value={selectedSection || ''}
            onValueChange={onSectionChange}
            disabled={!selectedBranch || !selectedSemester || sections.length === 0}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 disabled:opacity-50">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {sections.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  {!selectedBranch || !selectedSemester
                    ? 'Select branch and semester first'
                    : 'No sections available'}
                </SelectItem>
              ) : (
                sections.map((section: any) => (
                  <SelectItem key={section.id} value={section.id}>
                    <span className="text-slate-100">{section.name}</span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
