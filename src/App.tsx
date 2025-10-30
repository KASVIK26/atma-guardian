import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Dashboard from "./pages/Dashboard";
import UniversityStructure from "./pages/UniversityStructure";
import NotFound from "./pages/NotFound";
import University from "./pages/University";
import BuildingsRooms from "./pages/BuildingsRooms";
import AttendanceRecords from "./pages/AttendanceRecords";
import LectureSessions from "./pages/LectureSessions";
import UsersManagement from "./pages/UsersManagement";
import AcademicCalendar from "./pages/AcademicCalendar";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import { SidebarItem } from "./components/layout/Sidebar";
import { Users, GraduationCap, Clock, TrendingUp, Plus, Calendar, MapPin, Bell, Activity, BookOpen, UserCheck, AlertTriangle, ChevronRight, Building2, School, Settings as SettingsIcon, BarChart3, FileText, UserCog, Shield, Database, Wifi, Camera, Menu, X } from "lucide-react";

const queryClient = new QueryClient();

const sidebarItems: SidebarItem[] = [
	{ id: 'dashboard', title: 'Dashboard', description: 'Overview & stats', icon: BarChart3, route: '/dashboard' },
	{ id: 'university', title: 'Your University', description: 'Manage university info', icon: School, route: '/university' },
	{ id: 'buildings', title: 'Buildings & Rooms', description: 'Campus infrastructure', icon: Building2, route: '/buildings' },
	{ id: 'attendance', title: 'Attendance Records', description: 'Attendance analytics', icon: UserCheck, route: '/attendance' },
	{ id: 'sessions', title: 'Lecture Sessions', description: 'Live session management', icon: BookOpen, route: '/sessions' },
	{ id: 'calendar', title: 'Academic Calendar', description: 'View academic events', icon: Calendar, route: '/calendar' },
	{ id: 'users', title: 'User Management', description: 'Manage users', icon: Users, route: '/users' },
	// ...add more items as needed...
];

// Component to handle route-based state synchronization
const AppRouter = () => {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [currentPage, setCurrentPage] = useState('dashboard');
	const location = useLocation();

	// Sync currentPage with the current route
	useEffect(() => {
		const path = location.pathname;
		const matchingItem = sidebarItems.find(item => item.route === path);
		if (matchingItem) {
			setCurrentPage(matchingItem.id);
		}
	}, [location.pathname]);

	return (
		<Routes>
			<Route path="/" element={<Welcome />} />
			<Route path="/auth/login" element={<Login />} />
			<Route path="/auth/signup" element={<Signup />} />
			<Route path="/dashboard" element={<Dashboard sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />} />
			<Route path="/university" element={<University sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />} />
			<Route path="/buildings" element={<BuildingsRooms sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />} />
			<Route path="/attendance" element={<AttendanceRecords sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />} />
			<Route path="/sessions" element={<LectureSessions sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />} />
			<Route path="/users" element={<UsersManagement sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />} />
			<Route path="/structure" element={<UniversityStructure sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />} />
			<Route path="/calendar" element={<AcademicCalendar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={currentPage} setCurrentPage={setCurrentPage} sidebarItems={sidebarItems} />} />
			<Route path="/profile" element={<Profile />} />
			<Route path="/settings" element={<Settings />} />
			<Route path="/notifications" element={<Notifications />} />
			<Route path="*" element={<NotFound />} />
		</Routes>
	);
};

const App = () => {
	return (
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<Toaster />
				<Sonner />
				<BrowserRouter>
					<AppRouter />
				</BrowserRouter>
			</TooltipProvider>
		</QueryClientProvider>
	);
}

export default App;
