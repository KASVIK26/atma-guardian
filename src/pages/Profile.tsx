import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/layout/Navbar";
import { PageHeader } from "@/components/layout/PageHeader";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  Edit,
  Save,
  X,
  Camera,
  School,
  Building
} from "lucide-react";
import { supabase } from '../lib/supabase';
import { toast } from '@/hooks/use-toast';
import { withAuth } from '../lib/withAuth';

function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    avatar_url: '',
    role: '',
    university_name: '',
    department: '',
    employee_id: '',
    joined_date: ''
  });
  const [editProfile, setEditProfile] = useState(profile);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setUser(userData.user);
        
        const { data: profileData } = await supabase
          .from('users')
          .select(`
            full_name,
            email,
            phone,
            address,
            avatar_url,
            role,
            employee_id,
            created_at,
            university_id,
            universities(name)
          `)
          .single();

        if (profileData) {
          const profileInfo = {
            full_name: profileData.full_name || '',
            email: profileData.email || userData.user.email || '',
            phone: profileData.phone || '',
            address: profileData.address || '',
            avatar_url: profileData.avatar_url || '',
            role: profileData.role || 'user',
            university_name: (profileData.universities as any)?.name || '',
            department: '',
            employee_id: profileData.employee_id || '',
            joined_date: profileData.created_at ? new Date(profileData.created_at).toLocaleDateString() : ''
          };
          setProfile(profileInfo);
          setEditProfile(profileInfo);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: editProfile.full_name,
          phone: editProfile.phone,
          address: editProfile.address,
          avatar_url: editProfile.avatar_url
        });

      if (error) throw error;

      setProfile(editProfile);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditProfile(profile);
    setIsEditing(false);
  };

  const roleColors = {
    admin: "bg-red-500",
    teacher: "bg-blue-500", 
    student: "bg-green-500",
    user: "bg-gray-500"
  };

  return (
    <div className="min-h-screen dark bg-background">
      <Navbar showProfileMenu />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Profile"
          description="Manage your personal information and account settings"
        />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader className="text-center">
                <div className="relative mx-auto mb-4">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src={profile.avatar_url || "/avatar.png"} alt={profile.full_name} />
                    <AvatarFallback className="text-lg">
                      {profile.full_name?.slice(0, 2) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-xl">{profile.full_name || "User"}</CardTitle>
                <CardDescription>{profile.email}</CardDescription>
                <div className="flex justify-center mt-2">
                  <Badge 
                    className={`${roleColors[profile.role]} text-white capitalize`}
                  >
                    {profile.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <School className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.university_name || "No university assigned"}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Joined {profile.joined_date}</span>
                </div>
                {profile.employee_id && (
                  <div className="flex items-center space-x-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">ID: {profile.employee_id}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Profile Details */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Update your personal details and contact information
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancel}
                          disabled={loading}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={loading}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    {isEditing ? (
                      <Input
                        id="full_name"
                        value={editProfile.full_name}
                        onChange={(e) => setEditProfile(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.full_name || "Not provided"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.email}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={editProfile.phone}
                        onChange={(e) => setEditProfile(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                      />
                    ) : (
                      <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.phone || "Not provided"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{profile.role}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Role is managed by administrators</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  {isEditing ? (
                    <Input
                      id="address"
                      value={editProfile.address}
                      onChange={(e) => setEditProfile(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter your address"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{profile.address || "Not provided"}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="university">University</Label>
                  <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.university_name || "No university assigned"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">University assignment is managed by administrators</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(Profile);
