import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  ArrowRight, 
  School, 
  User, 
  Mail, 
  Lock, 
  Building, 
  MapPin, 
  Upload,
  CheckCircle2,
  Users,
  Calendar,
  BookOpen,
  GraduationCap
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Admin Details", icon: User },
  { id: 2, title: "University Info", icon: Building },
  { id: 3, title: "Academic Structure", icon: GraduationCap },
  { id: 4, title: "Data Import", icon: Upload },
  { id: 5, title: "Confirmation", icon: CheckCircle2 }
];

export default function Signup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Account created successfully!");
      navigate("/dashboard");
    }, 2000);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="Sarah" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Johnson" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="admin@university.edu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Create a strong password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="Confirm your password" />
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="universityName">University Name</Label>
              <Input id="universityName" placeholder="Stanford University" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" placeholder="450 Serra Mall, Stanford, CA 94305" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Stanford" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input id="state" placeholder="California" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">University Logo</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <Button variant="outline">Upload Logo</Button>
                <p className="text-xs text-muted-foreground mt-2">
                  SVG, PNG or JPG (max 2MB)
                </p>
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-primary" />
                Academic Programs
              </h3>
              <div className="space-y-2">
                <Label>Programs (e.g., Engineering, Business, Medicine)</Label>
                <Input placeholder="Computer Science, Business Administration, Medicine" />
              </div>
              <div className="space-y-2">
                <Label>Branches (within programs)</Label>
                <Input placeholder="Software Engineering, Data Science, AI/ML" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Years</Label>
                  <Input placeholder="1, 2, 3, 4" />
                </div>
                <div className="space-y-2">
                  <Label>Sections</Label>
                  <Input placeholder="A, B, C, D" />
                </div>
              </div>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 Don't worry, you can modify the academic structure later from the dashboard.
              </p>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary" />
                Import Students
              </h3>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <Button variant="outline">Upload Students CSV</Button>
                <p className="text-xs text-muted-foreground mt-2">
                  CSV with columns: Name, Email, Student ID, Program, Year, Section
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                Import Timetable
              </h3>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <Button variant="outline">Upload Timetable CSV</Button>
                <p className="text-xs text-muted-foreground mt-2">
                  CSV with columns: Day, Time, Subject, Teacher, Room, Section
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-primary">
                ⚡ You can skip this step and add students/timetables manually later.
              </p>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center space-y-6"
          >
            <div className="w-16 h-16 bg-gradient-primary rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">You're all set!</h3>
              <p className="text-muted-foreground">
                Review your information and complete the setup to start using ATMA.
              </p>
            </div>
            
            <div className="text-left space-y-4 bg-muted/30 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Admin:</span>
                <span className="text-sm font-medium">Dr. Sarah Johnson</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">University:</span>
                <span className="text-sm font-medium">Stanford University</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm font-medium">admin@stanford.edu</span>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen dark bg-background flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <motion.div
        className="w-full max-w-2xl relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <Link 
          to="/" 
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </Link>

        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <img 
                src="/logo.png" 
                alt="ATMA Logo" 
                className="w-12 h-12"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ATMA
              </span>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Create Your ATMA Account</CardTitle>
              <CardDescription>
                Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
              </CardDescription>
            </div>
            
            {/* Progress */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                {STEPS.map((step) => (
                  <Badge 
                    key={step.id}
                    variant={step.id === currentStep ? "default" : step.id < currentStep ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    <step.icon className="w-3 h-3 mr-1" />
                    {step.id}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              {currentStep === STEPS.length ? (
                <Button 
                  onClick={handleSubmit}
                  disabled={isLoading}
                  variant="glow"
                  size="lg"
                >
                  {isLoading ? "Creating Account..." : "Complete Setup"}
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleNext} variant="glow">
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{" "}
          <Link 
            to="/auth/login" 
            className="text-primary hover:text-primary-glow font-medium"
          >
            Sign in here
          </Link>
        </div>
      </motion.div>
    </div>
  );
}