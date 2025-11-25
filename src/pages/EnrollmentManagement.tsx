import { useState, useEffect } from 'react';
import { Upload, ChevronLeft, Users, Download, Trash2, Plus, Search, Loader2, Check, AlertTriangle, ChevronDown, ChevronUp, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { withAuth } from '../lib/withAuth';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useNavigate } from 'react-router-dom';
import { parseFile } from '@/lib/fileParser';
import * as XLSX from 'xlsx';

interface StudentEnrollment {
  id: string;
  university_id: string;
  section_id: string;
  student_id?: string;
  first_name: string;
  last_name: string;
  batch?: string;
  email: string;
  enrollment_no: string;
  is_active: boolean;
  source?: 'database' | 'preview'; // Track where student came from
}

interface ColumnMapping {
  [key: string]: string; // DB column -> File column
}

function EnrollmentManagement({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const navigate = useNavigate();
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [sectionData, setSectionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [students, setStudents] = useState<StudentEnrollment[]>([]); // Database enrolled students
  const [previewList, setPreviewList] = useState<StudentEnrollment[]>([]); // File-imported students (pending save)
  const [previewExpanded, setPreviewExpanded] = useState(true); // Toggle preview list visibility
  const [enrolledExpanded, setEnrolledExpanded] = useState(true); // Toggle enrolled list visibility
  const [selectedPreview, setSelectedPreview] = useState<Set<string>>(new Set()); // Preview selected items
  const [selectedEnrolled, setSelectedEnrolled] = useState<Set<string>>(new Set()); // Enrolled selected items
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false); // Duplicate check modal
  const [duplicates, setDuplicates] = useState<any[]>([]); // Found duplicates
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false); // Bulk delete confirmation
  const [bulkDeleteSource, setBulkDeleteSource] = useState<'preview' | 'enrolled' | null>(null); // Which list to delete from
  const [isDeleting, setIsDeleting] = useState(false); // Loading state during delete
  const [bulkDeleteDuplicates, setBulkDeleteDuplicates] = useState<any[]>([]); // Duplicates found during bulk delete
  const [savingEnrollment, setSavingEnrollment] = useState(false); // Loading state during save
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseStatus, setParseStatus] = useState('idle');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentEnrollment | null>(null);
  const [studentForm, setStudentForm] = useState({
    first_name: '',
    last_name: '',
    batch: '',
    email: '',
    enrollment_no: ''
  });
  
  // Column mapping for file upload
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [fileData, setFileData] = useState<any[]>([]); // Parsed data (StudentEnrollment objects)
  const [rawFileData, setRawFileData] = useState<any[][]>([]); // Raw rows from file for preview
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    first_name: 'skip',
    last_name: 'skip',
    email: 'skip',
    enrollment_no: 'skip',
    batch: 'skip'
  });
  const [fileColumns, setFileColumns] = useState<string[]>([]);

  useEffect(() => {
    if (currentPage !== 'enrollment') {
      setCurrentPage('enrollment');
    }
    
    const params = new URLSearchParams(window.location.search);
    const id = params.get('sectionId');
    if (id) {
      setSectionId(id);
      fetchEnrollmentData(id);
    } else {
      console.error('No sectionId in URL params');
      toast.error('No section selected');
      setTimeout(() => navigate('/university'), 1500);
    }
  }, [currentPage, setCurrentPage, navigate]);

  const fetchEnrollmentData = async (id: string) => {
    try {
      setLoading(true);
      console.log('Fetching enrollment data for section:', id);
      
      // Fetch section details - only basic fields, no foreign key joins
      const { data: section, error: sectionError } = await supabase
        .from('sections')
        .select('id, university_id, program_id, branch_id, semester_id, name, code, capacity, batches')
        .eq('id', id)
        .single();
      
      if (sectionError) {
        console.error('Error fetching section:', sectionError);
        throw sectionError;
      }
      
      if (!section) {
        console.error('Section not found:', id);
        toast.error('Section not found');
        navigate('/university');
        return;
      }
      
      console.log('Section loaded:', section);
      setSectionData(section);

      // Fetch enrolled students - try primary table first
      console.log('Attempting to fetch from student_enrollments...');
      const { data: enrolled, error: enrollError } = await supabase
        .from('student_enrollments')
        .select('*')
        .eq('section_id', id);
      
      if (enrollError) {
        console.warn('student_enrollments query error, trying student_enrollment:', enrollError);
        // Try alternate table name
        const { data: alt, error: altError } = await supabase
          .from('student_enrollment')
          .select('*')
          .eq('section_id', id);
        
        if (altError) {
          console.warn('Both table queries failed, showing empty list:', altError);
          setStudents([]);
        } else {
          console.log('Got data from student_enrollment:', alt?.length || 0, 'records');
          setStudents(alt || []);
        }
      } else {
        console.log('Got data from student_enrollments:', enrolled?.length || 0, 'records');
        setStudents(enrolled || []);
      }
    } catch (error: any) {
      console.error('Error in fetchEnrollmentData:', error);
      toast.error(error.message || 'Failed to load enrollment data');
      setSectionData(null);
      setStudents([]);
    } finally {
      setLoading(false);
      console.log('Loading complete');
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadProgress(10);
      setParseStatus('parsing');
      setUploadedFile(file);

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (!rawData || rawData.length === 0) {
        toast.error('File is empty');
        setUploadProgress(0);
        setParseStatus('idle');
        return;
      }

      // Extract header row and convert to lowercase for comparison
      const headerRow = (rawData[0] as any[]).map(cell => cell ? cell.toString().trim() : '');
      const fileColumns = headerRow;
      const lowerCaseHeaders = headerRow.map(h => h.toLowerCase());
      
      console.log('File columns detected:', fileColumns);
      console.log('Lowercase headers:', lowerCaseHeaders);
      
      // Auto-detect column mapping by matching common patterns
      const autoMapping: ColumnMapping = {
        first_name: 'skip',
        last_name: 'skip',
        email: 'skip',
        enrollment_no: 'skip',
        batch: 'skip'
      };
      
      // Define matching patterns for each field
      const firstNamePatterns = ['first name', 'first_name', 'firstname', 'fname'];
      const lastNamePatterns = ['last name', 'last_name', 'lastname', 'lname'];
      const emailPatterns = ['email', 'email id', 'email address', 'mail', 'e-mail'];
      const enrollmentNoPatterns = ['enrollment no', 'enrollment no.', 'enrollment number', 'enrollment_no', 'enrollment_number', 'enrollment', 'enr no'];
      const batchPatterns = ['batch', 'section batch', 'batch name', 'batch code'];
      
      // Match columns
      for (let i = 0; i < lowerCaseHeaders.length; i++) {
        const header = lowerCaseHeaders[i];
        
        if (firstNamePatterns.some(pattern => header.includes(pattern))) {
          autoMapping.first_name = fileColumns[i];
        } else if (lastNamePatterns.some(pattern => header.includes(pattern))) {
          autoMapping.last_name = fileColumns[i];
        } else if (emailPatterns.some(pattern => header.includes(pattern))) {
          autoMapping.email = fileColumns[i];
        } else if (enrollmentNoPatterns.some(pattern => header.includes(pattern))) {
          autoMapping.enrollment_no = fileColumns[i];
        } else if (batchPatterns.some(pattern => header.includes(pattern))) {
          autoMapping.batch = fileColumns[i];
        }
      }
      
      console.log('Auto-detected mapping:', autoMapping);
      
      // Set column mapping and raw data
      setColumnMapping(autoMapping);
      setFileColumns(fileColumns);
      setRawFileData(rawData.slice(1)); // Store raw data without header for preview
      setFileData(rawData.slice(1)); // Use raw data as fileData
      
      setUploadProgress(0);
      setParseStatus('idle');
      setMappingDialogOpen(true);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setParseStatus('error');
      toast.error('Failed to upload file');
      setUploadProgress(0);
    }
  };

  const handleConfirmMapping = async () => {
    try {
      // Helper function to extract batch number from batch string
      // A1 -> 1, CSE2 -> 2, or just "1" -> 1
      const extractBatchNumber = (batchValue: string | null | undefined): string | null => {
        if (!batchValue) return null;
        const batchStr = batchValue.toString().trim();
        if (!batchStr) return null;
        
        // Extract last digit(s) from the string
        const match = batchStr.match(/\d+$/);
        return match ? match[0] : null;
      };
      
      // Transform file data using column mapping - always use array format
      const newStudents: StudentEnrollment[] = fileData.map((row: any, rowIdx: number) => {
        if (!Array.isArray(row)) {
          console.warn(`Row ${rowIdx} is not an array, skipping`);
          return null;
        }
        
        // Get column indices
        const firstNameIdx = fileColumns.indexOf(columnMapping.first_name);
        const lastNameIdx = fileColumns.indexOf(columnMapping.last_name);
        const emailIdx = fileColumns.indexOf(columnMapping.email);
        const enrollmentNoIdx = fileColumns.indexOf(columnMapping.enrollment_no);
        const batchIdx = fileColumns.indexOf(columnMapping.batch);
        
        // Extract values from row
        const firstName = firstNameIdx >= 0 ? (row[firstNameIdx]?.toString().trim() || '') : '';
        const lastName = lastNameIdx >= 0 ? (row[lastNameIdx]?.toString().trim() || '') : '';
        const email = emailIdx >= 0 ? (row[emailIdx]?.toString().trim() || '') : '';
        const enrollmentNo = enrollmentNoIdx >= 0 ? (row[enrollmentNoIdx]?.toString().trim() || '') : '';
        let batch = batchIdx >= 0 && columnMapping.batch !== 'skip' ? (row[batchIdx]?.toString().trim() || '') : '';
        
        // Extract batch number (last digit) for int4 database column
        if (batch) {
          const batchNum = extractBatchNumber(batch);
          batch = batchNum || batch; // Use extracted number if available, else keep original
        }
        
        return {
          id: `${Date.now()}-${Math.random()}`,
          university_id: sectionData?.university_id || '',
          section_id: sectionId || '',
          student_id: undefined,
          first_name: firstName,
          last_name: lastName,
          batch: batch || null,
          email: email,
          enrollment_no: enrollmentNo,
          is_active: false,  // ✅ Default to false (not yet signed up)
          source: 'preview'  // ✅ Mark as from preview list
        };
      }).filter(Boolean) as StudentEnrollment[];
      
      // Add to preview list only (NOT enrolled students yet)
      setPreviewList(prev => [...prev, ...newStudents]);
      toast.success(`${newStudents.length} students added to preview. Click "Save Enrollment" to confirm.`);
      
      // Clear form
      setMappingDialogOpen(false);
      setFileData([]);
      setRawFileData([]);
      setFileColumns([]);
      setColumnMapping({ first_name: 'skip', last_name: 'skip', email: 'skip', enrollment_no: 'skip', batch: 'skip' });
      setUploadedFile(null);
    } catch (error) {
      console.error('Error confirming mapping:', error);
      toast.error('Failed to process mapped data');
    }
  };

  const handleAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({ first_name: '', last_name: '', batch: '', email: '', enrollment_no: '' });
    setDialogOpen(true);
  };

  const handleEditStudent = (student: StudentEnrollment) => {
    setEditingStudent(student);
    setStudentForm({
      first_name: student.first_name,
      last_name: student.last_name,
      batch: student.batch || '',
      email: student.email,
      enrollment_no: student.enrollment_no
    });
    setDialogOpen(true);
  };

  const handleSaveStudent = async () => {
    if (!studentForm.first_name || !studentForm.last_name || !studentForm.email || !studentForm.enrollment_no) {
      toast.error('First name, last name, email, and enrollment number are required');
      return;
    }

    try {
      // Extract batch number if batch is provided (A1 -> 1, CSE2 -> 2)
      let batchValue: string | null = null;
      if (studentForm.batch && studentForm.batch !== 'skip') {
        const match = studentForm.batch.match(/\d+$/);
        batchValue = match ? match[0] : null;
      }

      if (editingStudent) {
        // If editing from preview list, update in preview
        if (editingStudent.source === 'preview') {
          setPreviewList(prev => prev.map(s =>
            s.id === editingStudent.id
              ? { 
                  ...s, 
                  first_name: studentForm.first_name, 
                  last_name: studentForm.last_name, 
                  email: studentForm.email, 
                  enrollment_no: studentForm.enrollment_no, 
                  batch: batchValue || undefined 
                }
              : s
          ));
          toast.success('Preview student updated');
        } else {
          // If editing from enrolled list, update in database
          console.log('Updating student:', editingStudent.id, studentForm);
          const { error } = await supabase
            .from('student_enrollments')
            .update({
              first_name: studentForm.first_name,
              last_name: studentForm.last_name,
              email: studentForm.email,
              enrollment_no: studentForm.enrollment_no,
              batch: batchValue,
              updated_at: new Date().toISOString()
            })
            .eq('id', editingStudent.id);
          
          if (error) throw error;
          
          // Update local state
          setStudents(prev => prev.map(s =>
            s.id === editingStudent.id
              ? { ...s, first_name: studentForm.first_name, last_name: studentForm.last_name, email: studentForm.email, enrollment_no: studentForm.enrollment_no, batch: batchValue || undefined }
              : s
          ));
          toast.success('Student updated successfully');
        }
      } else {
        // Add new student to preview list (NOT database yet)
        console.log('Adding new student to preview:', studentForm);
        
        const newStudent: StudentEnrollment = {
          id: `${Date.now()}-${Math.random()}`,
          university_id: sectionData?.university_id || '',
          section_id: sectionId || '',
          first_name: studentForm.first_name,
          last_name: studentForm.last_name,
          email: studentForm.email,
          enrollment_no: studentForm.enrollment_no,
          batch: batchValue || undefined,
          student_id: undefined,
          is_active: false,  // ✅ Default to false
          source: 'preview'  // ✅ Mark as preview
        };
        setPreviewList(prev => [...prev, newStudent]);
        toast.success('Student added to preview. Click "Save Enrollment" to confirm.');
      }
      setDialogOpen(false);
      setStudentForm({ first_name: '', last_name: '', batch: '', email: '', enrollment_no: '' });
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save student');
    }
  };

  // ✅ Check for duplicates GLOBALLY (across all sections) - OPTIMIZED: single query
  const checkForDuplicates = async () => {
    const foundDuplicates: any[] = [];
    
    try {
      if (previewList.length === 0) return foundDuplicates;
      
      // Get all enrollment numbers and emails from preview at once
      const enrollmentNos = previewList.map(s => s.enrollment_no);
      const emails = previewList.map(s => s.email);
      
      // 🔄 GLOBAL CHECK: Find all records in ANY section
      const { data: allExisting, error } = await supabase
        .from('student_enrollments')
        .select('id, section_id, enrollment_no, email, first_name, last_name')
        // Don't filter by section_id - check ALL sections!
        .or(`enrollment_no.in.(${enrollmentNos.join(',')}),email.in.(${emails.join(',')})`);
      
      if (error) {
        console.warn('Error checking duplicates:', error);
        return foundDuplicates;
      }
      
      // If we have duplicates, fetch section details 
      if (allExisting && allExisting.length > 0) {
        // Get unique section IDs
        const sectionIds = [...new Set(allExisting.map(e => e.section_id))];
        
        // Fetch full section details in one query
        const { data: sectionDetails } = await supabase
          .from('sections')
          .select('id, code, name, program_id, branch_id, semester_id, programs(id, code, name), branches(id, code, name), semesters(id, name, academic_year)')
          .in('id', sectionIds);
        
        // Create a map for quick lookup
        const sectionMap = new Map();
        if (sectionDetails) {
          sectionDetails.forEach((section: any) => {
            sectionMap.set(section.id, section);
          });
        }
        
        // Match preview students with existing records
        previewList.forEach(previewStudent => {
          const duplicate = allExisting.find((existing: any) =>
            existing.enrollment_no === previewStudent.enrollment_no ||
            existing.email === previewStudent.email
          );
          
          if (duplicate) {
            const sectionData = sectionMap.get(duplicate.section_id);
            
            foundDuplicates.push({
              preview: previewStudent,
              enrolled: duplicate,
              matchType: duplicate.email === previewStudent.email ? 'Email' : 'Enrollment Number',
              existingSection: {
                id: duplicate.section_id,
                code: sectionData?.code,
                name: sectionData?.name,
                program: sectionData?.programs?.[0] ? {
                  code: (sectionData.programs as any)[0].code,
                  name: (sectionData.programs as any)[0].name
                } : null,
                branch: sectionData?.branches?.[0] ? {
                  code: (sectionData.branches as any)[0].code,
                  name: (sectionData.branches as any)[0].name
                } : null,
                semester: sectionData?.semesters?.[0] ? {
                  name: (sectionData.semesters as any)[0].name,
                  year: (sectionData.semesters as any)[0].academic_year
                } : null
              },
              existingId: duplicate.id,
              isGlobalDuplicate: true
            });
          }
        });
      }
    } catch (error) {
      console.error('Error in checkForDuplicates:', error);
    }
    
    return foundDuplicates;
  };

  // ✅ Check if student exists in any other section (OPTIMIZED: batch query instead of loop)
  const checkEnrollmentDuplicates = async (students: StudentEnrollment[]) => {
    try {
      const foundDuplicates: any[] = [];
      
      if (students.length === 0) return foundDuplicates;
      
      // Get all enrollment numbers at once
      const enrollmentNos = students.map(s => s.enrollment_no);
      
      // OPTIMIZED: Single query instead of looping
      const { data: allEnrollments, error } = await supabase
        .from('student_enrollments')
        .select('id, section_id, enrollment_no, first_name, last_name')
        .in('enrollment_no', enrollmentNos);
      
      if (error) {
        console.warn('Error checking enrollment duplicates:', error);
        return foundDuplicates;
      }
      
      // Check which students have enrollments in other sections
      if (allEnrollments && allEnrollments.length > 0) {
        students.forEach(student => {
          const otherSectionEnrollments = allEnrollments.filter(
            e => e.enrollment_no === student.enrollment_no && e.section_id !== sectionId
          );
          
          if (otherSectionEnrollments.length > 0) {
            foundDuplicates.push({
              student: student,
              existingEnrollments: otherSectionEnrollments,
              totalCount: otherSectionEnrollments.length
            });
          }
        });
      }
      
      return foundDuplicates;
    } catch (error) {
      console.error('Error checking enrollment duplicates:', error);
      return [];
    }
  };

  // ✅ Handle preview before save - check duplicates against DATABASE
  const handlePreviewBeforeSave = async () => {
    const foundDuplicates = await checkForDuplicates();
    setDuplicates(foundDuplicates);
    setDuplicateModalOpen(true);
  };

  // ✅ Proceed with save after duplicate check
  const handleProceedWithSave = async () => {
    setDuplicateModalOpen(false);
    await handleSaveEnrollment();
  };

  // ✅ Bulk delete with confirmation and duplicate check (OPTIMIZED: non-blocking)
  const handleBulkDeleteClick = async (source: 'preview' | 'enrolled') => {
    const selectedCount = source === 'preview' ? selectedPreview.size : selectedEnrolled.size;
    if (selectedCount === 0) {
      toast.error('No students selected');
      return;
    }
    
    setBulkDeleteSource(source);
    setBulkDeleteModalOpen(true); // Open modal immediately
    
    // Only check for duplicates when deleting from enrolled list
    // Do this AFTER modal opens to avoid blocking UI
    if (source === 'enrolled') {
      const selectedStudents = students.filter(s => selectedEnrolled.has(s.id));
      // Query in background
      const duplicates = await checkEnrollmentDuplicates(selectedStudents);
      setBulkDeleteDuplicates(duplicates);
    }
  };

  // ✅ Confirm bulk delete with loading state
  const handleConfirmBulkDelete = async () => {
    try {
      setIsDeleting(true);
      
      if (bulkDeleteSource === 'preview') {
        // Delete from preview list
        const newPreview = previewList.filter(s => !selectedPreview.has(s.id));
        setPreviewList(newPreview);
        setSelectedPreview(new Set());
        toast.success(`${selectedPreview.size} students removed from preview`);
      } else if (bulkDeleteSource === 'enrolled') {
        // Delete from enrolled list (database)
        const toDelete = Array.from(selectedEnrolled);
        
        for (const id of toDelete) {
          const { error } = await supabase
            .from('student_enrollments')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
        }
        
        const newEnrolled = students.filter(s => !selectedEnrolled.has(s.id));
        setStudents(newEnrolled);
        setSelectedEnrolled(new Set());
        toast.success(`${selectedEnrolled.size} students removed`);
      }
      setBulkDeleteModalOpen(false);
      setBulkDeleteDuplicates([]);
    } catch (error) {
      console.error('Error bulk deleting enrolled students:', error);
      toast.error('Failed to delete students');
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ Toggle selection
  const toggleSelectPreview = (id: string) => {
    setSelectedPreview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectEnrolled = (id: string) => {
    setSelectedEnrolled(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // ✅ Select all
  const selectAllPreview = () => {
    if (selectedPreview.size === previewList.length) {
      setSelectedPreview(new Set());
    } else {
      setSelectedPreview(new Set(previewList.map(s => s.id)));
    }
  };

  const selectAllEnrolled = () => {
    if (selectedEnrolled.size === filteredStudents.length) {
      setSelectedEnrolled(new Set());
    } else {
      setSelectedEnrolled(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleDeleteStudent = async (id: string, source?: 'database' | 'preview') => {
    if (confirm('Are you sure you want to remove this student?')) {
      try {
        console.log('Deleting student:', id, 'from', source);
        
        // If from preview list, just remove from state
        if (source === 'preview') {
          setPreviewList(prev => prev.filter(s => s.id !== id));
          toast.success('Student removed from preview');
          return;
        }
        
        // If from database, delete from database
        const { error } = await supabase
          .from('student_enrollments')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Update local state
        setStudents(prev => prev.filter(s => s.id !== id));
        toast.success('Student removed successfully');
      } catch (error) {
        console.error('Error deleting student:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to delete student');
      }
    }
  };

  // ✅ Helper: Parse Supabase error and extract duplicate info
  const parseSupabaseError = async (error: any, failedData: any[]) => {
    const errorMessage = error?.message || error?.details || '';
    console.error('Supabase Error Details:', error);
    
    // Check for unique constraint violation
    if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate') || error?.code === '23505') {
      // Try to query which students already exist
      const duplicateStudents: any[] = [];
      
      try {
        for (const student of failedData) {
          const { data: existing } = await supabase
            .from('student_enrollments')
            .select('id, section_id, enrollment_no, email, first_name, last_name')
            .eq('section_id', sectionId)
            .or(`enrollment_no.eq.${student.enrollment_no},email.eq.${student.email}`);
          
          if (existing && existing.length > 0) {
            duplicateStudents.push({
              student: student,
              existing: existing[0],
              sectionId: sectionId
            });
          }
        }
      } catch (queryError) {
        console.warn('Error querying duplicates:', queryError);
      }
      
      return {
        type: 'duplicate',
        message: 'Duplicate students found',
        duplicates: duplicateStudents
      };
    }
    
    return {
      type: 'unknown',
      message: errorMessage || 'Unknown error occurred',
      duplicates: []
    };
  };

  // ✅ Format duplicate message for toast
  const formatDuplicateMessage = (duplicates: any[]) => {
    if (duplicates.length === 0) return 'Student already present in section';
    
    const showCount = Math.min(duplicates.length, 3);
    let message = '';
    
    for (let i = 0; i < showCount; i++) {
      const dup = duplicates[i];
      const studentName = dup.student?.first_name || dup.existing?.first_name || 'Unknown';
      const enrollmentNo = dup.student?.enrollment_no || dup.existing?.enrollment_no || '';
      message += `${studentName} (${enrollmentNo})`;
      if (i < showCount - 1) message += ', ';
    }
    
    if (duplicates.length > 3) {
      message += ` + ${duplicates.length - 3} more`;
    }
    
    message += ' already present in this section';
    return message;
  };

  const handleSaveEnrollment = async () => {
    try {
      if (!sectionId) return;

      setSavingEnrollment(true);

      // ✅ Only save students from preview list (to-be-enrolled students)
      const enrollmentData = previewList
        .filter(s => s.enrollment_no && s.email) // Only save records with enrollment_no and email
        .map(s => ({
          university_id: s.university_id,
          section_id: sectionId,
          student_id: s.student_id || null,
          first_name: s.first_name,
          last_name: s.last_name,
          batch: s.batch || null,
          email: s.email,
          enrollment_no: s.enrollment_no,
          is_active: s.is_active
        }));

      if (enrollmentData.length === 0) {
        toast.error('No students in preview to save');
        setSavingEnrollment(false);
        return;
      }

      // Insert new records (not upsert) to avoid duplicates
      let error;
      let result = await supabase
        .from('student_enrollments')
        .insert(enrollmentData);
      
      error = result.error;
      
      // Fallback to alternate table name
      if (error?.message.includes('not found')) {
        result = await supabase
          .from('student_enrollment')
          .insert(enrollmentData);
        error = result.error;
      }

      if (error) {
        // Check if it's a unique constraint violation (error code 23505)
        if (error.code === '23505') {
          // 🔄 MOVE STUDENTS: Instead of blocking, move them to new section
          const movedStudents = [];
          const failedMovements = [];
          
          for (const student of enrollmentData) {
            try {
              // Find existing enrollment record
              const { data: existing } = await supabase
                .from('student_enrollments')
                .select('id, section_id, first_name, last_name, enrollment_no')
                .or(`enrollment_no.eq.${student.enrollment_no},email.eq.${student.email}`)
                .single();

              if (existing) {
                // Move student to new section
                const { error: updateError } = await supabase
                  .from('student_enrollments')
                  .update({ section_id: sectionId })
                  .eq('id', existing.id);

                if (!updateError) {
                  movedStudents.push({
                    name: `${existing.first_name} ${existing.last_name}`,
                    enrollment_no: existing.enrollment_no,
                    from_section: existing.section_id,
                    to_section: sectionId
                  });
                } else {
                  failedMovements.push(student.enrollment_no);
                }
              }
            } catch (err) {
              console.error(`Error moving student ${student.enrollment_no}:`, err);
              failedMovements.push(student.enrollment_no);
            }
          }

          // Show results to user
          if (movedStudents.length > 0) {
            const moveMessage = movedStudents.length === 1
              ? `✅ Moved ${movedStudents[0].name} from Section ${movedStudents[0].from_section} to Section ${movedStudents[0].to_section}`
              : `✅ Moved ${movedStudents.length} student(s) to Section ${sectionId}`;
            
            toast.success(moveMessage);
            
            // Show details if only a few students
            if (movedStudents.length <= 3) {
              console.log('Moved students:', movedStudents);
            }
          }

          if (failedMovements.length > 0) {
            toast.error(`Failed to move ${failedMovements.length} student(s): ${failedMovements.join(', ')}`);
          }

          // Clear preview and refresh
          setPreviewList([]);
          fetchEnrollmentData(sectionId);
          setSavingEnrollment(false);
          return;
        }

        // Handle other errors
        const parsedError = await parseSupabaseError(error, enrollmentData);
        
        if (parsedError.type === 'duplicate' && parsedError.duplicates.length > 0) {
          const friendlyMessage = formatDuplicateMessage(parsedError.duplicates);
          toast.error(friendlyMessage);
        } else {
          toast.error(parsedError.message || 'Failed to save enrollment');
        }
        setSavingEnrollment(false);
        return;
      }
      
      toast.success(`${enrollmentData.length} enrollments saved successfully`);
      
      // Clear preview list and refresh enrolled students
      setPreviewList([]);
      fetchEnrollmentData(sectionId);
      setSavingEnrollment(false);
    } catch (error) {
      console.error('Error saving enrollment:', error);
      const parsedError = await parseSupabaseError(error, previewList.map(s => ({
        enrollment_no: s.enrollment_no,
        email: s.email,
        first_name: s.first_name
      })));
      
      if (parsedError.type === 'duplicate' && parsedError.duplicates.length > 0) {
        const friendlyMessage = formatDuplicateMessage(parsedError.duplicates);
        toast.error(friendlyMessage);
      } else {
        toast.error(parsedError.message || 'Failed to save enrollment');
      }
      setSavingEnrollment(false);
    }
  };

  const filteredStudents = students.filter(s =>
    (`${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
     s.enrollment_no.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedBatch === 'all' || (s.batch ? String(s.batch) : '') === (selectedBatch.match(/\d+$/) ? selectedBatch.match(/\d+$/)?.[0] : selectedBatch))
  );

  // Generate batch labels from section batches
  // If section has 3 batches, generate labels: A1, A2, A3 (for display)
  // Database stores only: 1, 2, 3
  const batches = sectionData?.batches && sectionData.batches.length > 0
    ? Array.from({ length: sectionData.batches.length }, (_, i) => `${sectionData.code}${i + 1}`)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Users className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading enrollment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark bg-background flex">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        sidebarItems={sidebarItems}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar showProfileMenu />
        
        <div className="flex-1 overflow-y-auto p-6">
          {!loading && !sectionData ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold">Section Not Found</h2>
                <p className="text-sm text-muted-foreground">The section you're trying to access doesn't exist or has been deleted.</p>
              </div>
              <Button onClick={() => navigate('/university')} variant="outline" className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back to University
              </Button>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/university')}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                
                <div>
                  <h1 className="text-3xl font-bold">Student Enrollment</h1>
                  {sectionData && (
                    <p className="text-muted-foreground mt-1">
                      {sectionData.code} - Section {sectionData.name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import Students</CardTitle>
                <CardDescription>Upload a CSV or Excel file with student data</CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <label className="cursor-pointer block">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">CSV, XLSX supported</p>
                    <Input
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="hidden"
                    />
                  </label>
                  {uploadProgress > 0 && (
                    <div className="mt-4">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{uploadProgress}% - {parseStatus}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Filter Section */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map(batch => (
                    <SelectItem key={batch} value={batch}>
                      {batch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button onClick={handleAddStudent} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Student
              </Button>
            </div>

            {/* Preview Students List - Only show if has items */}
            {previewList.length > 0 && (
              <Card className="border-yellow-500/50 bg-yellow-50/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewExpanded(!previewExpanded)}
                        className="h-6 w-6 p-0"
                      >
                        {previewExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <CardTitle className="text-base">
                        Preview Students
                        <Badge className="ml-2 bg-yellow-600">{previewList.length}</Badge>
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedPreview.size > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleBulkDeleteClick('preview')}
                          className="text-destructive hover:bg-destructive/10"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          {isDeleting ? 'Deleting...' : `Delete Selected (${selectedPreview.size})`}
                        </Button>
                      )}
                      <Button 
                        onClick={handlePreviewBeforeSave}
                        className="gap-2"
                        disabled={savingEnrollment}
                      >
                        {savingEnrollment ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Save {previewList.length} Students
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {previewExpanded && (
                  <CardContent>
                    {previewList.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No students in preview</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-yellow-100/20">
                              <TableHead className="w-10">
                                <input
                                  type="checkbox"
                                  checked={selectedPreview.size === previewList.length && previewList.length > 0}
                                  onChange={selectAllPreview}
                                  className="rounded"
                                  title="Select all"
                                />
                              </TableHead>
                              <TableHead>Enrollment No.</TableHead>
                              <TableHead>First Name</TableHead>
                              <TableHead>Last Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Batch</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          
                          <TableBody>
                            {previewList.map(student => (
                              <TableRow key={student.id} className="hover:bg-yellow-100/10">
                                <TableCell className="w-10">
                                  <input
                                    type="checkbox"
                                    checked={selectedPreview.has(student.id)}
                                    onChange={() => toggleSelectPreview(student.id)}
                                    className="rounded"
                                  />
                                </TableCell>
                                <TableCell className="font-mono font-semibold">{student.enrollment_no}</TableCell>
                                <TableCell className="font-medium">{student.first_name}</TableCell>
                                <TableCell className="font-medium">{student.last_name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{student.email}</TableCell>
                                <TableCell>
                                  {student.batch ? (
                                    <Badge variant="outline">{student.batch}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">Preview</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditStudent(student)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteStudent(student.id, 'preview')}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Enrolled Students Table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEnrolledExpanded(!enrolledExpanded)}
                      className="h-6 w-6 p-0"
                    >
                      {enrolledExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <CardTitle>
                      Enrolled Students
                      <Badge className="ml-2">{filteredStudents.length}</Badge>
                    </CardTitle>
                  </div>
                  {selectedEnrolled.size > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleBulkDeleteClick('enrolled')}
                      className="text-destructive hover:bg-destructive/10"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {isDeleting ? 'Deleting...' : `Delete Selected (${selectedEnrolled.size})`}
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              {enrolledExpanded && (
                <CardContent>
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No students enrolled yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-10">
                              <input
                                type="checkbox"
                                checked={selectedEnrolled.size === filteredStudents.length && filteredStudents.length > 0}
                                onChange={selectAllEnrolled}
                                className="rounded"
                                title="Select all"
                              />
                            </TableHead>
                            <TableHead>Enrollment No.</TableHead>
                            <TableHead>First Name</TableHead>
                            <TableHead>Last Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Batch</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        
                        <TableBody>
                          {filteredStudents.map(student => (
                            <TableRow key={student.id} className="hover:bg-muted/50">
                              <TableCell className="w-10">
                                <input
                                  type="checkbox"
                                  checked={selectedEnrolled.has(student.id)}
                                  onChange={() => toggleSelectEnrolled(student.id)}
                                  className="rounded"
                                />
                              </TableCell>
                              <TableCell className="font-mono font-semibold">{student.enrollment_no}</TableCell>
                              <TableCell className="font-medium">{student.first_name}</TableCell>
                              <TableCell className="font-medium">{student.last_name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{student.email}</TableCell>
                              <TableCell>
                                {student.batch ? (
                                  <Badge variant="outline">{student.batch}</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {student.student_id ? (
                                  <Badge className="bg-green-600">Enrolled</Badge>
                                ) : (
                                  <Badge variant="secondary">Pending</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditStudent(student)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteStudent(student.id, 'database')}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
            </div>
          )}
        </div>
      </div>

      {/* Student Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
            <DialogDescription>
              {editingStudent ? 'Update student information' : 'Add a new student to enrollment'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name *</label>
              <Input
                value={studentForm.first_name}
                onChange={(e) => setStudentForm({...studentForm, first_name: e.target.value})}
                placeholder="First name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name *</label>
              <Input
                value={studentForm.last_name}
                onChange={(e) => setStudentForm({...studentForm, last_name: e.target.value})}
                placeholder="Last name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={studentForm.email}
                onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                placeholder="student@university.edu"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Enrollment Number *</label>
              <Input
                value={studentForm.enrollment_no}
                onChange={(e) => setStudentForm({...studentForm, enrollment_no: e.target.value})}
                placeholder="E.g., ENR001234"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Batch</label>
              <Select value={studentForm.batch} onValueChange={(val) => setStudentForm({...studentForm, batch: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(batch => (
                    <SelectItem key={batch} value={batch}>
                      {batch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStudent}>
              {editingStudent ? 'Update' : 'Add'} Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-invisible-dark">
          <DialogHeader>
            <DialogTitle>Map File Columns to Database Fields</DialogTitle>
            <DialogDescription>
              Match columns from your file to database fields. Preview shows {fileData.length} records to be imported.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Column Mapping Grid */}
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">File contains {fileColumns.length} columns. Map required fields:</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white">First Name *</label>
                  <Select value={columnMapping.first_name} onValueChange={(val) => setColumnMapping({...columnMapping, first_name: val})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {fileColumns.map(col => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white">Last Name *</label>
                  <Select value={columnMapping.last_name} onValueChange={(val) => setColumnMapping({...columnMapping, last_name: val})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {fileColumns.map(col => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white">Email *</label>
                  <Select value={columnMapping.email} onValueChange={(val) => setColumnMapping({...columnMapping, email: val})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {fileColumns.map(col => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white">Enrollment Number *</label>
                  <Select value={columnMapping.enrollment_no} onValueChange={(val) => setColumnMapping({...columnMapping, enrollment_no: val})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {fileColumns.map(col => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-semibold text-white">Batch *</label>
                  <Select value={columnMapping.batch} onValueChange={(val) => setColumnMapping({...columnMapping, batch: val})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column or skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">— Skip this field —</SelectItem>
                      {fileColumns.map(col => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-sm font-medium mb-3 text-foreground">Preview (First 3 Records):</p>
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-foreground">First Name</TableHead>
                      <TableHead className="text-foreground">Last Name</TableHead>
                      <TableHead className="text-foreground">Email</TableHead>
                      <TableHead className="text-foreground">Enrollment No</TableHead>
                      <TableHead className="text-foreground">Batch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fileData.slice(0, 3).map((row: any, idx: number) => {
                      if (!Array.isArray(row)) return null;
                      
                      // Get column indices from fileColumns
                      const firstNameIdx = fileColumns.indexOf(columnMapping.first_name);
                      const lastNameIdx = fileColumns.indexOf(columnMapping.last_name);
                      const emailIdx = fileColumns.indexOf(columnMapping.email);
                      const enrollmentNoIdx = fileColumns.indexOf(columnMapping.enrollment_no);
                      const batchIdx = fileColumns.indexOf(columnMapping.batch);
                      
                      return (
                        <TableRow key={idx} className="hover:bg-muted/50">
                          <TableCell className="text-xs">{firstNameIdx >= 0 && row[firstNameIdx] ? row[firstNameIdx] : '—'}</TableCell>
                          <TableCell className="text-xs">{lastNameIdx >= 0 && row[lastNameIdx] ? row[lastNameIdx] : '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{emailIdx >= 0 && row[emailIdx] ? row[emailIdx] : '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{enrollmentNoIdx >= 0 && row[enrollmentNoIdx] ? row[enrollmentNoIdx] : '—'}</TableCell>
                          <TableCell className="text-xs">{batchIdx >= 0 && row[batchIdx] ? row[batchIdx] : '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setMappingDialogOpen(false);
              setFileData([]);
              setRawFileData([]);
              setFileColumns([]);
              setColumnMapping({ first_name: 'skip', last_name: 'skip', email: 'skip', enrollment_no: 'skip', batch: 'skip' });
            }}>
              Cancel & Clear
            </Button>
            <Button 
              onClick={handleConfirmMapping}
              disabled={!columnMapping.first_name || !columnMapping.last_name || !columnMapping.email || !columnMapping.enrollment_no}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Import {fileData.length} Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Check Modal */}
      <Dialog open={duplicateModalOpen} onOpenChange={setDuplicateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Duplicate Students Found
            </DialogTitle>
            <DialogDescription>
              {duplicates.length > 0 
                ? `${duplicates.length} student(s) in preview already exist in the system` 
                : 'No duplicates found. Ready to save!'}
            </DialogDescription>
          </DialogHeader>

          {duplicates.length > 0 ? (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {duplicates.slice(0, 3).map((dup, idx) => (
                  <div key={idx} className="border-l-4 border-yellow-500 dark:border-yellow-600 pl-4 py-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-r">
                    <p className="text-sm font-semibold mb-2 text-yellow-900 dark:text-yellow-200">
                      Duplicate #{idx + 1} - Matched by {dup.matchType}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">Trying to Add:</p>
                        <p className="font-mono text-sm font-bold text-yellow-900 dark:text-yellow-100">{dup.preview.enrollment_no}</p>
                        <p className="text-yellow-900 dark:text-yellow-200">{dup.preview.first_name} {dup.preview.last_name}</p>
                        <p className="text-yellow-700 dark:text-yellow-400 text-xs">{dup.preview.email}</p>
                      </div>
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">Already in Section:</p>
                        <p className="font-mono text-sm font-bold text-yellow-900 dark:text-yellow-100">{dup.enrolled.enrollment_no}</p>
                        <p className="text-yellow-900 dark:text-yellow-200">{dup.enrolled.first_name} {dup.enrolled.last_name}</p>
                        <p className="text-yellow-700 dark:text-yellow-400 text-xs">{dup.enrolled.email}</p>
                        
                        {/* Display Section Details */}
                        <div className="mt-2 pt-2 border-t border-yellow-300 dark:border-yellow-700">
                          <p className="text-blue-700 dark:text-blue-400 font-semibold text-xs mb-1">📍 Current Section:</p>
                          {dup.existingSection?.program && (
                            <p className="text-blue-800 dark:text-blue-300 text-xs">
                              <strong>Program:</strong> {dup.existingSection.program.code} - {dup.existingSection.program.name}
                            </p>
                          )}
                          {dup.existingSection?.branch && (
                            <p className="text-blue-800 dark:text-blue-300 text-xs">
                              <strong>Branch:</strong> {dup.existingSection.branch.code} - {dup.existingSection.branch.name}
                            </p>
                          )}
                          {dup.existingSection?.semester && (
                            <p className="text-blue-800 dark:text-blue-300 text-xs">
                              <strong>Semester:</strong> {dup.existingSection.semester.name} ({dup.existingSection.semester.year})
                            </p>
                          )}
                          {dup.existingSection?.code && (
                            <p className="text-blue-800 dark:text-blue-300 text-xs">
                              <strong>Section Code:</strong> {dup.existingSection.code}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {duplicates.length > 3 && (
                  <div className="border-l-4 border-yellow-500 dark:border-yellow-600 pl-4 py-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-r">
                    <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
                      + {duplicates.length - 3} more duplicate(s)
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                      Scroll to see all duplicates
                    </p>
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg p-3">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  ℹ️ Student Already Exists
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  These students are already enrolled in another section. You can either:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 ml-4 list-disc">
                  <li><strong>Move</strong> them to this section (they will be transferred)</li>
                  <li><strong>Cancel</strong> and remove from preview if not needed</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <Check className="h-12 w-12 text-green-600 dark:text-green-500 mx-auto mb-2" />
                <p className="font-medium text-green-900 dark:text-green-100">No duplicates detected!</p>
                <p className="text-sm text-green-700 dark:text-green-400">Ready to save all students.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleProceedWithSave} 
              className="gap-2"
              variant={duplicates.length > 0 ? "default" : "default"}
            >
              {duplicates.length > 0 ? (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Move Students ({duplicates.length})
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Proceed with Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirm Bulk Delete
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please review before proceeding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Main Warning Box */}
            <div className="bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-700 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                ⚠️ Deletion Summary
              </p>
              <p className="text-sm text-red-800 dark:text-red-200">
                You are about to delete <span className="font-bold text-red-600 dark:text-red-400">
                  {bulkDeleteSource === 'preview' ? selectedPreview.size : selectedEnrolled.size}
                </span> student(s) from the <span className="font-bold text-red-600 dark:text-red-400">
                  {bulkDeleteSource === 'preview' ? 'Preview' : 'Enrolled'}
                </span> list.
              </p>
              {bulkDeleteSource === 'enrolled' && (
                <p className="text-sm text-red-700 dark:text-red-300 mt-2 font-medium">
                  ⚠️ These students will be permanently deleted from the database and cannot be recovered.
                </p>
              )}
              {bulkDeleteSource === 'preview' && (
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                  These students will be removed from preview (not yet saved to database).
                </p>
              )}
            </div>

            {/* Show Loading state while checking duplicates */}
            {bulkDeleteSource === 'enrolled' && bulkDeleteDuplicates.length === 0 && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Checking if these students exist in other sections...
                  </p>
                </div>
              </div>
            )}

            {/* Show Enrollment Duplicates if found */}
            {bulkDeleteDuplicates.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                      Students Found in Other Sections
                    </p>
                    <div className="space-y-2">
                      {bulkDeleteDuplicates.slice(0, 3).map((dup, idx) => (
                        <div key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
                          <p className="font-medium">
                            {dup.student.first_name} {dup.student.last_name}
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 ml-2">
                            Enrollment #: {dup.student.enrollment_no} • Also in {dup.totalCount} section(s)
                          </p>
                          {dup.existingEnrollments.length > 0 && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 ml-2">
                              Section IDs: {dup.existingEnrollments.map(e => e.section_id).join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                      {bulkDeleteDuplicates.length > 3 && (
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 font-medium">
                          + {bulkDeleteDuplicates.length - 3} more student(s) found in other sections
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setBulkDeleteModalOpen(false);
                setBulkDeleteDuplicates([]);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmBulkDelete}
              variant="destructive"
              className="gap-2"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Confirm Delete {bulkDeleteSource === 'preview' ? selectedPreview.size : selectedEnrolled.size} Students
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(EnrollmentManagement);
