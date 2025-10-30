import * as XLSX from 'xlsx';
import { parse as papaParseCSV } from 'papaparse';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface TimetableEntry {
  day: string;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseName: string;
  instructor: string;
  room: string;
  semester?: number;
}

export interface StudentEnrollment {
  studentId: string;
  rollNumber: string;
  name: string;
  email?: string;
  phone?: string;
  year?: number;
}

export interface ParseResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
  totalRecords: number;
}

/**
 * Parse PDF files - handles both timetables and enrollment lists
 */
export async function parsePDF(file: File, type: 'timetable' | 'enrollment'): Promise<ParseResult<TimetableEntry | StudentEnrollment>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    
    let fullText = '';
    
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    if (type === 'timetable') {
      return parseTimetableText(fullText);
    } else {
      return parseEnrollmentText(fullText);
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [`Failed to parse PDF: ${error.message}`],
      warnings: [],
      totalRecords: 0
    };
  }
}

/**
 * Parse DOCX files - handles both timetables and enrollment lists
 */
export async function parseDOCX(file: File, type: 'timetable' | 'enrollment'): Promise<ParseResult<TimetableEntry | StudentEnrollment>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value;

    if (type === 'timetable') {
      return parseTimetableText(text);
    } else {
      return parseEnrollmentText(text);
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [`Failed to parse DOCX: ${error.message}`],
      warnings: [],
      totalRecords: 0
    };
  }
}

/**
 * Parse Excel files - handles both timetables and enrollment lists
 */
export async function parseExcel(file: File, type: 'timetable' | 'enrollment'): Promise<ParseResult<TimetableEntry | StudentEnrollment>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (type === 'timetable') {
      return parseTimetableFromRows(data as string[][]);
    } else {
      return parseEnrollmentFromRows(data as string[][]);
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [`Failed to parse Excel: ${error.message}`],
      warnings: [],
      totalRecords: 0
    };
  }
}

/**
 * Parse CSV files - handles both timetables and enrollment lists
 */
export async function parseCSV(file: File, type: 'timetable' | 'enrollment'): Promise<ParseResult<TimetableEntry | StudentEnrollment>> {
  return new Promise((resolve) => {
    papaParseCSV(file, {
      complete: (results) => {
        try {
          if (type === 'timetable') {
            resolve(parseTimetableFromRows(results.data as string[][]));
          } else {
            resolve(parseEnrollmentFromRows(results.data as string[][]));
          }
        } catch (error) {
          resolve({
            success: false,
            data: [],
            errors: [`Failed to parse CSV: ${error.message}`],
            warnings: [],
            totalRecords: 0
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          errors: [`CSV parsing error: ${error.message}`],
          warnings: [],
          totalRecords: 0
        });
      }
    });
  });
}

/**
 * Parse timetable from text content
 */
function parseTimetableText(text: string): ParseResult<TimetableEntry> {
  const entries: TimetableEntry[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Common patterns for timetable parsing
  const timePattern = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g;
  const dayPattern = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi;
  const coursePattern = /([A-Z]{2,}\d{3,})/g;

  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip header lines
    if (line.toLowerCase().includes('timetable') || 
        line.toLowerCase().includes('schedule') ||
        line.toLowerCase().includes('time') && line.toLowerCase().includes('subject')) {
      continue;
    }

    // Try to extract timetable entry from line
    const timeMatch = line.match(timePattern);
    const dayMatch = line.match(dayPattern);
    const courseMatch = line.match(coursePattern);

    if (timeMatch && dayMatch && courseMatch) {
      const startTime = `${timeMatch[0].split('-')[0].trim()}`;
      const endTime = `${timeMatch[0].split('-')[1].trim()}`;
      
      entries.push({
        day: dayMatch[0].toLowerCase(),
        startTime: startTime,
        endTime: endTime,
        courseCode: courseMatch[0],
        courseName: extractCourseName(line, courseMatch[0]),
        instructor: extractInstructor(line),
        room: extractRoom(line)
      });
    }
  }

  return {
    success: entries.length > 0,
    data: entries,
    errors,
    warnings: entries.length === 0 ? ['No timetable entries found. Please check file format.'] : warnings,
    totalRecords: entries.length
  };
}

/**
 * Parse enrollment from text content
 */
function parseEnrollmentText(text: string): ParseResult<StudentEnrollment> {
  const students: StudentEnrollment[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Common patterns for student data
  const rollPattern = /(\d{8,12})/g;
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const phonePattern = /(\+?\d{10,15})/g;

  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip header lines
    if (line.toLowerCase().includes('student') && line.toLowerCase().includes('list') ||
        line.toLowerCase().includes('roll') && line.toLowerCase().includes('name')) {
      continue;
    }

    const rollMatch = line.match(rollPattern);
    const emailMatch = line.match(emailPattern);
    const phoneMatch = line.match(phonePattern);

    if (rollMatch) {
      students.push({
        studentId: rollMatch[0], // Will be mapped to actual user ID later
        rollNumber: rollMatch[0],
        name: extractStudentName(line, rollMatch[0]),
        email: emailMatch ? emailMatch[0] : undefined,
        phone: phoneMatch ? phoneMatch[0] : undefined
      });
    }
  }

  return {
    success: students.length > 0,
    data: students,
    errors,
    warnings: students.length === 0 ? ['No student enrollments found. Please check file format.'] : warnings,
    totalRecords: students.length
  };
}

/**
 * Parse timetable from structured rows (Excel/CSV)
 */
function parseTimetableFromRows(rows: string[][]): ParseResult<TimetableEntry> {
  const entries: TimetableEntry[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    return {
      success: false,
      data: [],
      errors: ['No data found in file'],
      warnings: [],
      totalRecords: 0
    };
  }

  // Try to find header row and column indices
  const headerRow = rows[0];
  const dayCol = findColumnIndex(headerRow, ['day', 'days']);
  const startTimeCol = findColumnIndex(headerRow, ['start', 'start time', 'from']);
  const endTimeCol = findColumnIndex(headerRow, ['end', 'end time', 'to']);
  const courseCol = findColumnIndex(headerRow, ['course', 'subject', 'course code']);
  const instructorCol = findColumnIndex(headerRow, ['instructor', 'teacher', 'faculty']);
  const roomCol = findColumnIndex(headerRow, ['room', 'classroom', 'venue']);

  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || !row.some(cell => cell && cell.toString().trim())) continue;

    try {
      const entry: TimetableEntry = {
        day: dayCol >= 0 ? row[dayCol]?.toString() || '' : '',
        startTime: startTimeCol >= 0 ? row[startTimeCol]?.toString() || '' : '',
        endTime: endTimeCol >= 0 ? row[endTimeCol]?.toString() || '' : '',
        courseCode: courseCol >= 0 ? row[courseCol]?.toString() || '' : '',
        courseName: courseCol >= 0 ? row[courseCol + 1]?.toString() || '' : '',
        instructor: instructorCol >= 0 ? row[instructorCol]?.toString() || '' : '',
        room: roomCol >= 0 ? row[roomCol]?.toString() || '' : ''
      };

      if (entry.day && entry.startTime && entry.courseCode) {
        entries.push(entry);
      }
    } catch (error) {
      errors.push(`Error processing row ${i + 1}: ${error.message}`);
    }
  }

  return {
    success: entries.length > 0,
    data: entries,
    errors,
    warnings,
    totalRecords: entries.length
  };
}

/**
 * Parse enrollment from structured rows (Excel/CSV)
 */
function parseEnrollmentFromRows(rows: string[][]): ParseResult<StudentEnrollment> {
  const students: StudentEnrollment[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    return {
      success: false,
      data: [],
      errors: ['No data found in file'],
      warnings: [],
      totalRecords: 0
    };
  }

  // Try to find header row and column indices
  const headerRow = rows[0];
  const rollCol = findColumnIndex(headerRow, ['roll', 'roll number', 'student id', 'id']);
  const nameCol = findColumnIndex(headerRow, ['name', 'student name', 'full name']);
  const emailCol = findColumnIndex(headerRow, ['email', 'email id', 'mail']);
  const phoneCol = findColumnIndex(headerRow, ['phone', 'mobile', 'contact']);

  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || !row.some(cell => cell && cell.toString().trim())) continue;

    try {
      const rollNumber = rollCol >= 0 ? row[rollCol]?.toString().trim() : '';
      const name = nameCol >= 0 ? row[nameCol]?.toString().trim() : '';

      if (rollNumber && name) {
        students.push({
          studentId: rollNumber, // Will be mapped to actual user ID later
          rollNumber: rollNumber,
          name: name,
          email: emailCol >= 0 ? row[emailCol]?.toString().trim() : undefined,
          phone: phoneCol >= 0 ? row[phoneCol]?.toString().trim() : undefined
        });
      }
    } catch (error) {
      errors.push(`Error processing row ${i + 1}: ${error.message}`);
    }
  }

  return {
    success: students.length > 0,
    data: students,
    errors,
    warnings,
    totalRecords: students.length
  };
}

// Helper functions
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.toString().toLowerCase() || '';
    if (possibleNames.some(name => header.includes(name))) {
      return i;
    }
  }
  return -1;
}

function extractCourseName(line: string, courseCode: string): string {
  // Try to extract course name after course code
  const parts = line.split(courseCode);
  if (parts.length > 1) {
    return parts[1].split(/[|\-,]/)[0].trim();
  }
  return '';
}

function extractInstructor(line: string): string {
  // Common patterns for instructor names
  const patterns = [
    /(?:prof|dr|mr|ms|mrs)\.?\s+([a-z\s]+)/gi,
    /instructor[:\s]+([a-z\s]+)/gi
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
}

function extractRoom(line: string): string {
  // Common patterns for room numbers
  const patterns = [
    /room[:\s]+([a-z0-9\-]+)/gi,
    /([a-z]?\d{2,4}[a-z]?)/gi
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
}

function extractStudentName(line: string, rollNumber: string): string {
  // Extract name by removing roll number and other common patterns
  let name = line.replace(rollNumber, '').trim();
  name = name.replace(/^\d+\s*/, ''); // Remove leading numbers
  name = name.replace(/[|,\-].+$/, ''); // Remove everything after separators
  return name.trim();
}

/**
 * Main file parser function - detects file type and parses accordingly
 */
export async function parseFile(file: File, type: 'timetable' | 'enrollment'): Promise<ParseResult<TimetableEntry | StudentEnrollment>> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();

  switch (fileExtension) {
    case 'pdf':
      return parsePDF(file, type);
    case 'docx':
    case 'doc':
      return parseDOCX(file, type);
    case 'xlsx':
    case 'xls':
      return parseExcel(file, type);
    case 'csv':
      return parseCSV(file, type);
    default:
      return {
        success: false,
        data: [],
        errors: [`Unsupported file type: ${fileExtension}`],
        warnings: [],
        totalRecords: 0
      };
  }
}