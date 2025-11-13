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
import { useFilterOptions } from '@/hooks/useLectureSessions';

interface FilterPanelProps {
  universityId: string;
  onProgramChange: (programId: string) => void;
  onBranchChange: (branchId: string) => void;
  onYearChange: (yearId: string) => void;
  onSectionChange: (sectionId: string) => void;
  selectedProgram?: string;
  selectedBranch?: string;
  selectedYear?: string;
  selectedSection?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  universityId,
  onProgramChange,
  onBranchChange,
  onYearChange,
  onSectionChange,
  selectedProgram,
  selectedBranch,
  selectedYear,
  selectedSection,
}) => {
  const { programs, branches, years, sections, loading, fetchBranches, fetchYears, fetchSections } =
    useFilterOptions({ universityId });

  // Fetch branches when program changes
  useEffect(() => {
    if (selectedProgram) {
      fetchBranches(selectedProgram);
    }
  }, [selectedProgram, fetchBranches]);

  // Fetch years when program changes
  useEffect(() => {
    if (universityId) {
      fetchYears(universityId);
    }
  }, [universityId, fetchYears]);

  // Fetch sections when branch or year changes
  useEffect(() => {
    if (selectedBranch && selectedYear) {
      fetchSections(selectedBranch, selectedYear);
    }
  }, [selectedBranch, selectedYear, fetchSections]);

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

        {/* Year Select */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">Academic Year</label>
          <Select value={selectedYear || ''} onValueChange={onYearChange}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {years.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  No years available
                </SelectItem>
              ) : (
                years.map((year: any) => (
                  <SelectItem key={year.id} value={year.id}>
                    <span className="text-slate-100">{year.academic_year}</span>
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
            disabled={!selectedBranch || !selectedYear || sections.length === 0}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 disabled:opacity-50">
              <SelectValue placeholder="Select a section" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {sections.length === 0 ? (
                <SelectItem value="_empty" disabled>
                  {!selectedBranch || !selectedYear ? 'Select branch and year first' : 'No sections available'}
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

        {/* Summary */}
        {selectedSection && (
          <div className="mt-6 p-3 bg-blue-950 border border-blue-700 rounded text-sm text-blue-100">
            ✓ Filters active - displaying sessions for selected section
          </div>
        )}
      </CardContent>
    </Card>
  );
};
