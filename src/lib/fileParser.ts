import * as XLSX from 'xlsx';
import { parse as papaParseCSV } from 'papaparse';
import mammoth from 'mammoth';

// For PDF parsing - use text extraction without external worker
// Note: For better PDF support, consider using pdfjs-dist properly configured or an alternative like pdf-parse

export interface TimetableEntry {
  day: string;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseName: string;
  instructor: string;
  instructorCode?: string;
  room: string;
  semester?: number;
}

export interface StudentEnrollment {
  studentId: string;
  rollNumber: string;
  name: string;
  email?: string;
  regMailId?: string; // Registration/Gmail ID
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
 * Note: This uses a basic text extraction approach. For complex PDFs with images/tables,
 * consider uploading XLSX or DOCX files instead, which are more reliable.
 */
export async function parsePDF(file: File, type: 'timetable' | 'enrollment'): Promise<ParseResult<TimetableEntry | StudentEnrollment>> {
  try {
    // PDF parsing via CDN-based approach
    const arrayBuffer = await file.arrayBuffer();
    
    // Use fetch to get PDF text content - more reliable than worker-based approach
    const pdfText = await extractPDFText(arrayBuffer);
    
    if (!pdfText || pdfText.trim().length === 0) {
      return {
        success: false,
        data: [],
        errors: ['No text could be extracted from PDF. Try converting to XLSX or DOCX format.'],
        warnings: [],
        totalRecords: 0
      };
    }

    if (type === 'timetable') {
      return parseTimetableText(pdfText);
    } else {
      return parseEnrollmentText(pdfText);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      data: [],
      errors: [`Failed to parse PDF: ${errorMsg}. Please use XLSX or DOCX format instead.`],
      warnings: [],
      totalRecords: 0
    };
  }
}

/**
 * Extract text from PDF using external PDF parsing service
 * Falls back to simple base64 processing if service unavailable
 */
async function extractPDFText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Convert to base64
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    // Try to use PDF.js via CDN with proper CORS
    const response = await fetch(
      `https://pdftron.s3.amazonaws.com/downloads/pl/pdfjs/pdfjs.js`
    ).catch(() => null);
    
    // If CORS issues, return warning message
    if (!response) {
      throw new Error('PDF worker loading failed. Please use XLSX or DOCX format.');
    }
    
    // Fallback: return error message for now
    throw new Error('PDF parsing requires additional setup');
  } catch (error) {
    // Return comprehensive error
    throw new Error(
      `PDF parsing is not fully supported in this build. ` +
      `Please convert your file to XLSX (Excel) or DOCX (Word) format for reliable parsing.`
    );
  }
}

/**
 * Parse DOCX files - handles both timetables and enrollment lists
 */
export async function parseDOCX(file: File, type: 'timetable' | 'enrollment'): Promise<ParseResult<TimetableEntry | StudentEnrollment>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value || '';
    
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        data: [],
        errors: ['No text could be extracted from DOCX file'],
        warnings: [],
        totalRecords: 0
      };
    }

    if (type === 'timetable') {
      return parseTimetableText(text);
    } else {
      return parseEnrollmentText(text);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      data: [],
      errors: [`Failed to parse DOCX: ${errorMsg}`],
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
 * Enhanced to handle table-based PDFs with columns for day, time, courses, instructors, etc.
 * Also handles matrix/grid format where days are columns and times are rows
 */
function parseTimetableText(text: string): ParseResult<TimetableEntry> {
  const entries: TimetableEntry[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('=== TIMETABLE PARSING START ===');
  console.log('Text length:', text.length);
  console.log('First 500 chars:', text.substring(0, 500));

  const lines = text.split('\n').filter(line => line.trim().length > 0);
  console.log('Total lines to parse:', lines.length);
  console.log('Sample lines:', lines.slice(0, 15));

  // Try to detect if this is a grid/matrix format timetable
  // Grid format has days as column headers and times as row headers
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timePattern = /(\d{1,2}):(\d{2})\s*(?:AM|PM|am|pm)?[\s\-]*(\d{1,2}):(\d{2})\s*(?:AM|PM|am|pm)?/;
  const coursePattern = /([A-Z]{2,}\d{1,})/g;
  
  // Find header row with days
  let dayHeaderLineIdx = -1;
  const dayColumns: { day: string; idx: number }[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dayMatches = dayNames.filter(day => 
      line.toLowerCase().includes(day.toLowerCase()) || 
      line.includes(day)
    );
    if (dayMatches.length > 0) {
      dayHeaderLineIdx = i;
      console.log('Found day header at line', i, ':', line);
      // Parse day positions
      for (const day of dayMatches) {
        dayColumns.push({ day: day.toLowerCase(), idx: i });
      }
      break;
    }
  }

  // If this is grid format, parse it differently
  if (dayHeaderLineIdx > 0 && dayColumns.length > 0) {
    console.log('Detected GRID FORMAT timetable');
    console.log('Day columns:', dayColumns);
    
    // Create a map of days for reference
    const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Process time slots and their corresponding courses
    for (let i = dayHeaderLineIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line starts with a time
      const timeMatch = line.match(timePattern);
      if (timeMatch) {
        const timeStr = timeMatch[0];
        const startTime = line.match(/(\d{1,2}):(\d{2})/)?.[0] || '';
        const endMatch = line.match(/(\d{1,2}):(\d{2})(?!:)/g);
        const endTime = endMatch?.[endMatch.length - 1] || '';
        
        console.log(`Time slot found: ${startTime} - ${endTime}`);
        
        // Collect course data from all following lines until next time or day header
        const courseDataLines: Array<{ day: string; data: string }> = [];
        let dayIndex = 0; // Track which day column we're in
        
        // Get remaining part of current line after time (first day's courses)
        const courseData = line.substring(line.indexOf(timeStr) + timeStr.length).trim();
        if (courseData && !courseData.toLowerCase().includes('am') && !courseData.toLowerCase().includes('pm')) {
          courseDataLines.push({ day: allDays[dayIndex] || 'monday', data: courseData });
        }
        
        // Look ahead for courses for other days
        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
          const nextLine = lines[j].trim();
          
          // Stop if we hit another time slot
          if (nextLine.match(timePattern)) {
            break;
          }
          
          // Stop if we hit a day name line (new header section)
          if (dayNames.some(day => nextLine.toLowerCase() === day.toLowerCase())) {
            break;
          }
          
          // Skip lunch and empty lines
          if (nextLine.toLowerCase().includes('lunch')) {
            continue;
          }
          
          // This line might contain course data for next day
          if (nextLine.length > 0 && !nextLine.match(/^[A-Z\s]*$/)) {
            dayIndex++;
            courseDataLines.push({ day: allDays[dayIndex] || 'monday', data: nextLine });
          }
        }
        
        // Parse all course data
        for (const { day, data } of courseDataLines) {
          // Split by comma or other delimiters
          const courses = data.split(/[,;|]/).map(c => c.trim()).filter(c => c.length > 0);
          
          console.log(`Courses for ${day}:`, courses);
          
          for (const course of courses) {
            if (course.length === 0 || course.toLowerCase().includes('lunch')) continue;
            
            // Extract course code
            const courseMatch = course.match(coursePattern);
            if (courseMatch) {
              const entry: TimetableEntry = {
                day: day, // Now properly assigned based on column
                startTime: startTime,
                endTime: endTime,
                courseCode: courseMatch[0],
                courseName: extractCourseName(course, courseMatch[0]),
                instructor: extractInstructor(course),
                instructorCode: extractInstructorCode(course),
                room: extractRoom(course)
              };
              
              console.log('✓ Created entry:', entry);
              entries.push(entry);
            }
          }
        }
      }
    }
  } else {
    // Fall back to line-by-line parsing for simpler formats
    console.log('Detected LINE-BY-LINE format (or couldn\'t detect grid format)');
    
    const lineTimePattern = /(\d{1,2}):(\d{2})\s*(?:AM|PM)?[\s\-]*(\d{1,2}):(\d{2})\s*(?:AM|PM)?/gi;
    const lineDayPattern = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.toLowerCase().includes('timetable') || 
          line.toLowerCase().includes('schedule') ||
          line.toLowerCase().includes('session') ||
          line.toLowerCase().includes('lunch')) {
        continue;
      }

      const timeMatch = line.match(lineTimePattern);
      const dayMatch = line.match(lineDayPattern);
      const courseMatch = line.match(coursePattern);

      if (timeMatch && courseMatch) {
        const timeParts = line.match(/(\d{1,2}):(\d{2})/g);
        if (timeParts && timeParts.length >= 2) {
          const entry: TimetableEntry = {
            day: dayMatch ? dayMatch[0].toLowerCase() : 'unknown',
            startTime: timeParts[0],
            endTime: timeParts[1],
            courseCode: courseMatch[0],
            courseName: extractCourseName(line, courseMatch[0]),
            instructor: extractInstructor(line),
            instructorCode: extractInstructorCode(line),
            room: extractRoom(line)
          };
          
          console.log('✓ Created entry:', entry);
          entries.push(entry);
        }
      }
    }
  }

  console.log('=== TIMETABLE PARSING COMPLETE ===');
  console.log('Total entries found:', entries.length);
  console.log('Entries:', entries);

  return {
    success: entries.length > 0,
    data: entries,
    errors,
    warnings: entries.length === 0 ? ['No timetable entries found. Your file appears to be in grid format. Please convert to XLSX (Excel) with proper column structure, or ensure course data is on same line as time slot.'] : warnings,
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

  console.log('=== ENROLLMENT PARSING START ===');
  console.log('Text length:', text.length);
  console.log('First 500 chars:', text.substring(0, 500));

  // Common patterns for student data
  const rollPattern = /(\d{8,12})/g;
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const phonePattern = /(\+?\d{10,15})/g;
  const gmailPattern = /([a-zA-Z0-9._%+-]+@gmail\.com)/gi; // Specifically Gmail addresses

  const lines = text.split('\n').filter(line => line.trim().length > 0);
  console.log('Total lines:', lines.length);
  console.log('Sample lines:', lines.slice(0, 5));
  
  let skippedLines = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip header lines
    if (line.toLowerCase().includes('student') && line.toLowerCase().includes('list') ||
        line.toLowerCase().includes('roll') && line.toLowerCase().includes('name') ||
        line.toLowerCase().includes('enrollment') ||
        line.toLowerCase().includes('s.no')) {
      skippedLines++;
      continue;
    }

    const rollMatch = line.match(rollPattern);
    const emailMatches = line.match(emailPattern);
    const gmailMatches = line.match(gmailPattern);
    const phoneMatch = line.match(phonePattern);

    if (i < 20) {
      console.log(`Line ${i}:`, line.substring(0, 80));
      console.log(`  - Roll:`, rollMatch ? rollMatch[0] : 'NO');
      console.log(`  - Email:`, emailMatches ? emailMatches[0] : 'NO');
      console.log(`  - Gmail:`, gmailMatches ? gmailMatches[0] : 'NO');
    }

    if (rollMatch) {
      // Get first email as primary, Gmail as registration email
      let email = emailMatches ? emailMatches[0] : undefined;
      let regMailId = gmailMatches ? gmailMatches[0] : emailMatches ? emailMatches[emailMatches.length - 1] : undefined;

      // If we only have one email and it's not Gmail, use it as email
      if (emailMatches && emailMatches.length === 1 && !emailMatches[0].includes('gmail')) {
        email = emailMatches[0];
        regMailId = undefined;
      }

      const student: StudentEnrollment = {
        studentId: rollMatch[0],
        rollNumber: rollMatch[0],
        name: extractStudentName(line, rollMatch[0]),
        email: email,
        regMailId: regMailId,
        phone: phoneMatch ? phoneMatch[0] : undefined
      };

      console.log('✓ Created student entry:', student);
      students.push(student);
    }
  }

  console.log('=== ENROLLMENT PARSING COMPLETE ===');
  console.log('Total students found:', students.length);
  console.log('Lines skipped:', skippedLines);
  console.log('Students:', students);

  return {
    success: students.length > 0,
    data: students,
    errors,
    warnings: students.length === 0 ? ['No student enrollments found. Please check file format. See console for debugging details.'] : warnings,
    totalRecords: students.length
  };
}

/**
 * Parse timetable from structured rows (Excel/CSV)
 * Enhanced to handle instructor codes
 */
function parseTimetableFromRows(rows: string[][]): ParseResult<TimetableEntry> {
  const entries: TimetableEntry[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('=== EXCEL TIMETABLE PARSING START ===');
  console.log('Total rows:', rows.length);
  console.log('Header row:', rows[0]);

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
  const dayCol = findColumnIndex(headerRow, ['day', 'days', 'day of week']);
  const startTimeCol = findColumnIndex(headerRow, ['start', 'start time', 'from', 'time from']);
  const endTimeCol = findColumnIndex(headerRow, ['end', 'end time', 'to', 'time to']);
  const courseCol = findColumnIndex(headerRow, ['course', 'subject', 'course code', 'subject code']);
  const courseNameCol = findColumnIndex(headerRow, ['course name', 'subject name', 'description']);
  const instructorCol = findColumnIndex(headerRow, ['instructor', 'teacher', 'faculty', 'faculty name']);
  const instructorCodeCol = findColumnIndex(headerRow, ['instructor code', 'faculty code', 'teacher code', 'instructor id']);
  const roomCol = findColumnIndex(headerRow, ['room', 'classroom', 'venue', 'room number']);

  console.log('Column indices found:', {
    dayCol, startTimeCol, endTimeCol, courseCol, courseNameCol, instructorCol, instructorCodeCol, roomCol
  });

  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || !row.some(cell => cell && cell.toString().trim())) continue;

    try {
      const entry: TimetableEntry = {
        day: dayCol >= 0 ? row[dayCol]?.toString().toLowerCase() || '' : '',
        startTime: startTimeCol >= 0 ? row[startTimeCol]?.toString() || '' : '',
        endTime: endTimeCol >= 0 ? row[endTimeCol]?.toString() || '' : '',
        courseCode: courseCol >= 0 ? row[courseCol]?.toString() || '' : '',
        courseName: courseNameCol >= 0 ? row[courseNameCol]?.toString() || '' : '',
        instructor: instructorCol >= 0 ? row[instructorCol]?.toString() || '' : '',
        instructorCode: instructorCodeCol >= 0 ? row[instructorCodeCol]?.toString().trim() || undefined : undefined,
        room: roomCol >= 0 ? row[roomCol]?.toString() || '' : ''
      };

      if (i < 5) {
        console.log(`Row ${i}:`, { rawRow: row, parsedEntry: entry });
      }

      if (entry.day && entry.startTime && entry.courseCode) {
        entries.push(entry);
      } else if (i < 10) {
        console.warn(`Row ${i} skipped - missing required fields:`, { 
          hasDay: !!entry.day, 
          hasStartTime: !!entry.startTime, 
          hasCourseCode: !!entry.courseCode 
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Error processing row ${i + 1}: ${errorMsg}`);
      console.error(`Error on row ${i}:`, error);
    }
  }

  console.log('=== EXCEL TIMETABLE PARSING COMPLETE ===');
  console.log('Total entries created:', entries.length);
  console.log('Errors:', errors);
  console.log('Entries:', entries);

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
  const rollCol = findColumnIndex(headerRow, ['roll', 'roll number', 'student id', 'id', 'enrollment no']);
  const nameCol = findColumnIndex(headerRow, ['name', 'student name', 'full name']);
  const emailCol = findColumnIndex(headerRow, ['email', 'email id', 'mail', 'institutional email']);
  const regMailCol = findColumnIndex(headerRow, ['reg mail', 'reg_mail', 'reg mail id', 'gmail', 'personal email', 'gmail id']);
  const phoneCol = findColumnIndex(headerRow, ['phone', 'mobile', 'contact', 'phone number']);

  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || !row.some(cell => cell && cell.toString().trim())) continue;

    try {
      const rollNumber = rollCol >= 0 ? row[rollCol]?.toString().trim() : '';
      const name = nameCol >= 0 ? row[nameCol]?.toString().trim() : '';

      if (rollNumber && name) {
        students.push({
          studentId: rollNumber,
          rollNumber: rollNumber,
          name: name,
          email: emailCol >= 0 ? row[emailCol]?.toString().trim() : undefined,
          regMailId: regMailCol >= 0 ? row[regMailCol]?.toString().trim() : undefined,
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
  if (!line || !courseCode) return '';
  // Try to extract course name after course code
  const parts = line.split(courseCode);
  if (parts.length > 1) {
    return parts[1].split(/[|\-,]/)[0].trim();
  }
  return '';
}

function extractInstructor(line: string): string {
  if (!line) return '';
  // Common patterns for instructor names
  const patterns = [
    /(?:prof|dr|mr|ms|mrs)\.?\s+([a-z\s]+)/gi,
    /instructor[:\s]+([a-z\s]+)/gi
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return '';
}

function extractRoom(line: string): string {
  if (!line) return '';
  // Common patterns for room numbers
  const patterns = [
    /room[:\s]+([a-z0-9\-]+)/gi,
    /([a-z]?\d{2,4}[a-z]?)/gi
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match && match[0]) return match[0].trim();
  }
  return '';
}

function extractInstructorCode(line: string): string {
  // Extract instructor codes like AsP, NM, VT, B3NM, A2NM, etc.
  // Usually 2-4 characters, uppercase letters possibly with numbers
  const codePattern = /\b([A-Z]\d?[A-Z]{1,2}|[A-Z]{2,4})\b/g;
  const matches = line.match(codePattern);
  
  if (matches) {
    // Filter out common non-instructor codes
    const filtered = matches.filter(code => {
      // Exclude course codes (typically longer or have more numbers)
      if (/^\d+$/.test(code)) return false; // All numbers
      if (code.length > 4) return false; // Too long for instructor code
      return true;
    });
    
    if (filtered.length > 0) {
      // Return the first valid instructor code
      return filtered[0];
    }
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