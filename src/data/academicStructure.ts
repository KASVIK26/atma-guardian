export interface AcademicProgram {
  id: string;
  name: string;
  code: string;
  type: 'undergraduate' | 'graduate' | 'doctoral' | 'professional';
  duration_years: number;
  description: string;
  common_branches: string[];
}

export interface ProgramBranch {
  id: string;
  name: string;
  code: string;
  program_type: string;
  description: string;
}

export interface AcademicYear {
  year_number: number;
  label: string;
  description: string;
}

// Predefined Academic Programs
export const ACADEMIC_PROGRAMS: AcademicProgram[] = [
  // Undergraduate Programs
  {
    id: 'bachelor-engineering',
    name: 'Bachelor of Engineering',
    code: 'B.E.',
    type: 'undergraduate',
    duration_years: 4,
    description: 'Four-year undergraduate engineering program',
    common_branches: ['Computer Science', 'Electrical', 'Mechanical', 'Civil', 'Electronics']
  },
  {
    id: 'bachelor-technology',
    name: 'Bachelor of Technology',
    code: 'B.Tech',
    type: 'undergraduate',
    duration_years: 4,
    description: 'Four-year undergraduate technology program',
    common_branches: ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil']
  },
  {
    id: 'bachelor-science',
    name: 'Bachelor of Science',
    code: 'B.Sc.',
    type: 'undergraduate',
    duration_years: 3,
    description: 'Three-year undergraduate science program',
    common_branches: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science']
  },
  {
    id: 'bachelor-arts',
    name: 'Bachelor of Arts',
    code: 'B.A.',
    type: 'undergraduate',
    duration_years: 3,
    description: 'Three-year undergraduate arts program',
    common_branches: ['English', 'History', 'Political Science', 'Economics', 'Psychology']
  },
  {
    id: 'bachelor-commerce',
    name: 'Bachelor of Commerce',
    code: 'B.Com',
    type: 'undergraduate',
    duration_years: 3,
    description: 'Three-year undergraduate commerce program',
    common_branches: ['Accounting', 'Finance', 'Marketing', 'Business Administration']
  },
  {
    id: 'bachelor-business-administration',
    name: 'Bachelor of Business Administration',
    code: 'BBA',
    type: 'undergraduate',
    duration_years: 3,
    description: 'Three-year undergraduate business program',
    common_branches: ['Management', 'Marketing', 'Finance', 'Human Resources', 'Operations']
  },
  {
    id: 'bachelor-computer-applications',
    name: 'Bachelor of Computer Applications',
    code: 'BCA',
    type: 'undergraduate',
    duration_years: 3,
    description: 'Three-year undergraduate computer applications program',
    common_branches: ['Software Development', 'Web Development', 'Database Management', 'Networking']
  },

  // Graduate Programs
  {
    id: 'master-engineering',
    name: 'Master of Engineering',
    code: 'M.E.',
    type: 'graduate',
    duration_years: 2,
    description: 'Two-year postgraduate engineering program',
    common_branches: ['Computer Science', 'Electrical', 'Mechanical', 'Civil', 'Electronics']
  },
  {
    id: 'master-technology',
    name: 'Master of Technology',
    code: 'M.Tech',
    type: 'graduate',
    duration_years: 2,
    description: 'Two-year postgraduate technology program',
    common_branches: ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil']
  },
  {
    id: 'master-science',
    name: 'Master of Science',
    code: 'M.Sc.',
    type: 'graduate',
    duration_years: 2,
    description: 'Two-year postgraduate science program',
    common_branches: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science']
  },
  {
    id: 'master-arts',
    name: 'Master of Arts',
    code: 'M.A.',
    type: 'graduate',
    duration_years: 2,
    description: 'Two-year postgraduate arts program',
    common_branches: ['English', 'History', 'Political Science', 'Economics', 'Psychology']
  },
  {
    id: 'master-commerce',
    name: 'Master of Commerce',
    code: 'M.Com',
    type: 'graduate',
    duration_years: 2,
    description: 'Two-year postgraduate commerce program',
    common_branches: ['Accounting', 'Finance', 'Marketing', 'Business Administration']
  },
  {
    id: 'master-business-administration',
    name: 'Master of Business Administration',
    code: 'MBA',
    type: 'graduate',
    duration_years: 2,
    description: 'Two-year postgraduate business program',
    common_branches: ['Management', 'Marketing', 'Finance', 'Human Resources', 'Operations', 'Strategy']
  },
  {
    id: 'master-computer-applications',
    name: 'Master of Computer Applications',
    code: 'MCA',
    type: 'graduate',
    duration_years: 2,
    description: 'Two-year postgraduate computer applications program',
    common_branches: ['Software Engineering', 'Data Science', 'Cybersecurity', 'AI/ML']
  },

  // Doctoral Programs
  {
    id: 'doctor-philosophy',
    name: 'Doctor of Philosophy',
    code: 'Ph.D.',
    type: 'doctoral',
    duration_years: 4,
    description: 'Four-year doctoral research program',
    common_branches: ['All Academic Disciplines']
  },

  // Professional Programs
  {
    id: 'bachelor-medicine',
    name: 'Bachelor of Medicine, Bachelor of Surgery',
    code: 'MBBS',
    type: 'professional',
    duration_years: 5,
    description: 'Five-year medical program',
    common_branches: ['General Medicine', 'Surgery', 'Pediatrics', 'Gynecology']
  },
  {
    id: 'bachelor-law',
    name: 'Bachelor of Laws',
    code: 'LL.B.',
    type: 'professional',
    duration_years: 3,
    description: 'Three-year law program',
    common_branches: ['Corporate Law', 'Criminal Law', 'Constitutional Law', 'International Law']
  },
  {
    id: 'bachelor-pharmacy',
    name: 'Bachelor of Pharmacy',
    code: 'B.Pharm',
    type: 'professional',
    duration_years: 4,
    description: 'Four-year pharmacy program',
    common_branches: ['Pharmaceutical Sciences', 'Clinical Pharmacy', 'Pharmacology']
  }
];

// Predefined Program Branches (organized by program type)
export const PROGRAM_BRANCHES: Record<string, ProgramBranch[]> = {
  'engineering-technology': [
    { id: 'cse', name: 'Computer Science and Engineering', code: 'CSE', program_type: 'engineering-technology', description: 'Software, algorithms, and computer systems' },
    { id: 'it', name: 'Information Technology', code: 'IT', program_type: 'engineering-technology', description: 'Information systems and technology solutions' },
    { id: 'ece', name: 'Electronics and Communication Engineering', code: 'ECE', program_type: 'engineering-technology', description: 'Electronics, telecommunications, and communication systems' },
    { id: 'eee', name: 'Electrical and Electronics Engineering', code: 'EEE', program_type: 'engineering-technology', description: 'Electrical systems and power engineering' },
    { id: 'me', name: 'Mechanical Engineering', code: 'ME', program_type: 'engineering-technology', description: 'Mechanical systems, manufacturing, and design' },
    { id: 'ce', name: 'Civil Engineering', code: 'CE', program_type: 'engineering-technology', description: 'Construction, infrastructure, and structural engineering' },
    { id: 'che', name: 'Chemical Engineering', code: 'CHE', program_type: 'engineering-technology', description: 'Chemical processes and materials engineering' },
    { id: 'ae', name: 'Aeronautical Engineering', code: 'AE', program_type: 'engineering-technology', description: 'Aircraft design and aerospace engineering' },
    { id: 'bio', name: 'Biotechnology Engineering', code: 'BIO', program_type: 'engineering-technology', description: 'Biological systems and biotechnology applications' },
    { id: 'auto', name: 'Automobile Engineering', code: 'AUTO', program_type: 'engineering-technology', description: 'Vehicle design and automotive systems' }
  ],
  'science': [
    { id: 'physics', name: 'Physics', code: 'PHY', program_type: 'science', description: 'Physical sciences and natural phenomena' },
    { id: 'chemistry', name: 'Chemistry', code: 'CHEM', program_type: 'science', description: 'Chemical sciences and molecular studies' },
    { id: 'mathematics', name: 'Mathematics', code: 'MATH', program_type: 'science', description: 'Mathematical sciences and analytical methods' },
    { id: 'biology', name: 'Biology', code: 'BIO', program_type: 'science', description: 'Biological sciences and life systems' },
    { id: 'computer-science', name: 'Computer Science', code: 'CS', program_type: 'science', description: 'Computational sciences and programming' },
    { id: 'statistics', name: 'Statistics', code: 'STAT', program_type: 'science', description: 'Statistical analysis and data science' },
    { id: 'environmental', name: 'Environmental Science', code: 'ENV', program_type: 'science', description: 'Environmental studies and sustainability' },
    { id: 'microbiology', name: 'Microbiology', code: 'MICRO', program_type: 'science', description: 'Microbial studies and biotechnology' }
  ],
  'arts-humanities': [
    { id: 'english', name: 'English Literature', code: 'ENG', program_type: 'arts-humanities', description: 'English language and literature studies' },
    { id: 'history', name: 'History', code: 'HIST', program_type: 'arts-humanities', description: 'Historical studies and research' },
    { id: 'political-science', name: 'Political Science', code: 'POL', program_type: 'arts-humanities', description: 'Political systems and governance' },
    { id: 'economics', name: 'Economics', code: 'ECON', program_type: 'arts-humanities', description: 'Economic theory and financial systems' },
    { id: 'psychology', name: 'Psychology', code: 'PSY', program_type: 'arts-humanities', description: 'Human behavior and mental processes' },
    { id: 'sociology', name: 'Sociology', code: 'SOC', program_type: 'arts-humanities', description: 'Social structures and human society' },
    { id: 'philosophy', name: 'Philosophy', code: 'PHIL', program_type: 'arts-humanities', description: 'Philosophical thought and ethics' },
    { id: 'journalism', name: 'Journalism', code: 'JOUR', program_type: 'arts-humanities', description: 'Media studies and communication' }
  ],
  'commerce-business': [
    { id: 'accounting', name: 'Accounting', code: 'ACC', program_type: 'commerce-business', description: 'Financial accounting and auditing' },
    { id: 'finance', name: 'Finance', code: 'FIN', program_type: 'commerce-business', description: 'Financial management and investment' },
    { id: 'marketing', name: 'Marketing', code: 'MKT', program_type: 'commerce-business', description: 'Market research and business promotion' },
    { id: 'management', name: 'Management', code: 'MGT', program_type: 'commerce-business', description: 'Business administration and leadership' },
    { id: 'human-resources', name: 'Human Resources', code: 'HR', program_type: 'commerce-business', description: 'Personnel management and organizational behavior' },
    { id: 'operations', name: 'Operations Management', code: 'OPS', program_type: 'commerce-business', description: 'Business operations and supply chain' },
    { id: 'international-business', name: 'International Business', code: 'IB', program_type: 'commerce-business', description: 'Global business and trade' },
    { id: 'entrepreneurship', name: 'Entrepreneurship', code: 'ENT', program_type: 'commerce-business', description: 'Business innovation and startup management' }
  ],
  'computer-applications': [
    { id: 'software-development', name: 'Software Development', code: 'SD', program_type: 'computer-applications', description: 'Software engineering and application development' },
    { id: 'web-development', name: 'Web Development', code: 'WD', program_type: 'computer-applications', description: 'Web technologies and online applications' },
    { id: 'database-management', name: 'Database Management', code: 'DB', program_type: 'computer-applications', description: 'Database systems and data management' },
    { id: 'networking', name: 'Computer Networking', code: 'NET', program_type: 'computer-applications', description: 'Network administration and cybersecurity' },
    { id: 'data-science', name: 'Data Science', code: 'DS', program_type: 'computer-applications', description: 'Data analytics and machine learning' },
    { id: 'mobile-development', name: 'Mobile App Development', code: 'MAD', program_type: 'computer-applications', description: 'Mobile application development' }
  ],
  'medical': [
    { id: 'general-medicine', name: 'General Medicine', code: 'GM', program_type: 'medical', description: 'General medical practice' },
    { id: 'surgery', name: 'Surgery', code: 'SURG', program_type: 'medical', description: 'Surgical procedures and techniques' },
    { id: 'pediatrics', name: 'Pediatrics', code: 'PED', program_type: 'medical', description: 'Child healthcare and medicine' },
    { id: 'gynecology', name: 'Gynecology', code: 'GYN', program_type: 'medical', description: 'Women\'s health and reproductive medicine' },
    { id: 'orthopedics', name: 'Orthopedics', code: 'ORTH', program_type: 'medical', description: 'Bone and joint medicine' },
    { id: 'cardiology', name: 'Cardiology', code: 'CARD', program_type: 'medical', description: 'Heart and cardiovascular medicine' }
  ],
  'law': [
    { id: 'corporate-law', name: 'Corporate Law', code: 'CORP', program_type: 'law', description: 'Business and corporate legal matters' },
    { id: 'criminal-law', name: 'Criminal Law', code: 'CRIM', program_type: 'law', description: 'Criminal justice and legal procedures' },
    { id: 'constitutional-law', name: 'Constitutional Law', code: 'CONST', program_type: 'law', description: 'Constitutional rights and governance' },
    { id: 'international-law', name: 'International Law', code: 'INTL', program_type: 'law', description: 'International legal frameworks' },
    { id: 'family-law', name: 'Family Law', code: 'FAM', program_type: 'law', description: 'Family and domestic legal matters' },
    { id: 'environmental-law', name: 'Environmental Law', code: 'ENV', program_type: 'law', description: 'Environmental regulations and policy' }
  ]
};

// Academic Years based on program duration
export const ACADEMIC_YEARS: AcademicYear[] = [
  { year_number: 1, label: 'First Year', description: 'Foundation year with basic concepts' },
  { year_number: 2, label: 'Second Year', description: 'Intermediate level with core subjects' },
  { year_number: 3, label: 'Third Year', description: 'Advanced studies and specialization' },
  { year_number: 4, label: 'Fourth Year', description: 'Final year with projects and internships' },
  { year_number: 5, label: 'Fifth Year', description: 'Extended program final year' },
  { year_number: 6, label: 'Sixth Year', description: 'Doctoral program continuation' }
];

// Helper functions
export const getProgramsByType = (type: string) => {
  return ACADEMIC_PROGRAMS.filter(program => program.type === type);
};

export const getBranchesByProgramCode = (programCode: string) => {
  // Map program codes to branch categories
  const branchMapping: Record<string, string> = {
    'B.E.': 'engineering-technology',
    'B.Tech': 'engineering-technology',
    'M.E.': 'engineering-technology',
    'M.Tech': 'engineering-technology',
    'B.Sc.': 'science',
    'M.Sc.': 'science',
    'B.A.': 'arts-humanities',
    'M.A.': 'arts-humanities',
    'B.Com': 'commerce-business',
    'M.Com': 'commerce-business',
    'BBA': 'commerce-business',
    'MBA': 'commerce-business',
    'BCA': 'computer-applications',
    'MCA': 'computer-applications',
    'MBBS': 'medical',
    'LL.B.': 'law',
    'B.Pharm': 'medical'
  };

  const category = branchMapping[programCode];
  return category ? PROGRAM_BRANCHES[category] || [] : [];
};

export const getYearsByProgramDuration = (durationYears: number) => {
  return ACADEMIC_YEARS.filter(year => year.year_number <= durationYears);
};
