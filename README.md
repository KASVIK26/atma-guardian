# ATMA Guardian - Attendance Management System

ATMA Guardian is a comprehensive attendance management system for universities using advanced validation techniques including geofencing, barometric pressure, TOTP codes, and sensor data analysis.

## Recent Updates

### 🎨 Color Scheme & UI Updates
- **Enhanced Dark Theme**: Implemented Midnight Shadow color palette with purple accents
- **Improved Contrast**: Deeper blacks (#141414) for better text readability
- **Purple Accents**: Primary (#4A3B5C), accent (#9B7BC7), and subtle gradients
- **Logo Update**: Changed from `/logo.png` to `/ATMA-LOGO.png` throughout the application

### 🔐 Authentication System
- **Streamlined Signup**: Reduced from 5 steps to 3 essential steps:
  1. Admin Account Creation
  2. University Setup
  3. Completion Confirmation
- **Supabase Integration**: Complete authentication system with type-safe operations
- **Role-based Access**: Admin, Teacher, and Student roles with appropriate permissions

### 🗄️ Database Architecture
- **Comprehensive Schema**: 20+ tables covering all aspects of attendance management
- **Advanced Features**: 
  - Geofencing with building and room coordinates
  - Barometric pressure validation for floor detection
  - TOTP-based attendance marking
  - Sensor data collection and analysis
  - Proxy detection algorithms
  - Real-time notifications

## Environment Setup

### Prerequisites
- Node.js 18+
- Supabase account
- Git

### Installation

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd atma-guardian
   npm install
   ```

2. **Environment Configuration**
   - Copy `.env.example` to `.env.local`
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

3. **Database Setup**
   - Deploy the provided SQL schema to your Supabase instance
   - Ensure Row Level Security (RLS) policies are properly configured
   - Set up the required stored functions and triggers

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Lovable Project Integration

**URL**: https://lovable.dev/projects/7322e538-9fa4-4103-a1dc-b7362fbb60d7

### Editing Options

**Use Lovable**
Simply visit the [Lovable Project](https://lovable.dev/projects/7322e538-9fa4-4103-a1dc-b7362fbb60d7) and start prompting. Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**
If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7322e538-9fa4-4103-a1dc-b7362fbb60d7) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

# Test commit by Kshitij

