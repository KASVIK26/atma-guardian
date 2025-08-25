import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { authHelpers } from "@/lib/supabase";
import type { SignupFormData } from "@/types/database";
import { 
  ArrowLeft, 
  ArrowRight, 
  User, 
  Building, 
  CheckCircle2
} from "lucide-react";

interface FormData extends SignupFormData {}

const STEPS = [
  { id: 1, title: "Admin Account", icon: User, description: "Create your admin account" },
  { id: 2, title: "University Details", icon: Building, description: "Setup university information" },
  { id: 3, title: "Complete Setup", icon: CheckCircle2, description: "Finalize your account" }
];

export default function Signup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    // Admin details
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    // University details
    universityName: '',
    universityCode: '',
    location: '',
    contactEmail: '',
    contactPhone: '',
    timezone: 'Asia/Kolkata'
  });

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.firstName && formData.lastName && formData.email && 
               formData.password && formData.password === formData.confirmPassword;
      case 2:
        return formData.universityName && formData.universityCode && formData.location;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else if (!validateStep(currentStep)) {
      toast.error("Please fill in all required fields");
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting signup process...');
      // Extract signup data (exclude confirmPassword)
      const { confirmPassword, ...signupData } = formData;
      
      console.log('Signup data prepared:', { ...signupData, password: '[HIDDEN]' });
      
      const result = await authHelpers.registerAdmin(signupData);
      
      if (result) {
        console.log('Signup successful:', { userId: result.user?.id, universityId: result.university?.id });
        toast.success("Account created successfully! Please check your email to verify your account.");
        
        // Navigate to a confirmation page or dashboard
        if (result.session) {
          navigate("/dashboard");
        } else {
          toast.info("Please check your email to verify your account before signing in.");
          navigate("/auth/login");
        }
      }
    } catch (error: any) {
      console.error('Signup error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        error: error
      });
      
      let errorMessage = "Failed to create account. Please try again.";
      
      // Handle specific error cases
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        errorMessage = "An account with this email already exists.";
      } else if (error.message?.includes('invalid input syntax')) {
        errorMessage = "Please check your input and try again.";
      } else if (error.message?.includes('permission denied') || error.code === '42501') {
        errorMessage = "Permission denied. Please contact support.";
      } else if (error.message?.includes('row-level security')) {
        errorMessage = "Database configuration issue. Please contact support.";
      } else if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
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
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Create Your Admin Account</h3>
              <p className="text-sm text-muted-foreground">
                Set up your administrator account to manage your university's attendance system
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input 
                  id="firstName" 
                  placeholder="Sarah" 
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input 
                  id="lastName" 
                  placeholder="Johnson" 
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@university.edu" 
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="Create a strong password" 
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                placeholder="Confirm your password" 
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              />
            </div>
            
            {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
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
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">University Information</h3>
              <p className="text-sm text-muted-foreground">
                Provide your university details to set up the attendance system
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="universityName">University Name *</Label>
              <Input 
                id="universityName" 
                placeholder="Stanford University" 
                value={formData.universityName}
                onChange={(e) => handleInputChange('universityName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="universityCode">University Code *</Label>
              <Input 
                id="universityCode" 
                placeholder="STAN_UNIV" 
                value={formData.universityCode}
                onChange={(e) => handleInputChange('universityCode', e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for your university (e.g., STAN_UNIV, MIT, HARVARD)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input 
                id="location" 
                placeholder="Stanford, California, USA" 
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input 
                  id="contactEmail" 
                  type="email" 
                  placeholder="info@university.edu" 
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input 
                  id="contactPhone" 
                  placeholder="+1 (650) 123-4567" 
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                />
              </div>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                💡 After account creation, you can:
                <br />• Set up academic programs and courses
                <br />• Add building and room information
                <br />• Invite teachers and students via email
                <br />• Configure geofencing and attendance settings
              </p>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center space-y-6"
          >
            <div className="w-16 h-16 bg-primary rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Ready to Launch!</h3>
              <p className="text-muted-foreground">
                Review your information and complete the setup to start using ATMA.
              </p>
            </div>
            
            <div className="text-left space-y-4 bg-muted/30 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Admin:</span>
                <span className="text-sm font-medium">{formData.firstName} {formData.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">University:</span>
                <span className="text-sm font-medium">{formData.universityName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Code:</span>
                <span className="text-sm font-medium">{formData.universityCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm font-medium">{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Location:</span>
                <span className="text-sm font-medium">{formData.location}</span>
              </div>
            </div>
            
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
              <p className="text-sm text-accent">
                🎉 After setup, you'll be redirected to your dashboard where you can start configuring your attendance system!
              </p>
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
                src="/ATMA-LOGO.png" 
                alt="ATMA Logo" 
                className="w-12 h-12"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
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
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  size="lg"
                >
                  {isLoading ? "Creating Account..." : "Complete Setup"}
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleNext} 
                  disabled={!validateStep(currentStep)}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                >
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
            className="text-primary hover:text-accent font-medium"
          >
            Sign in here
          </Link>
        </div>
      </motion.div>
    </div>
  );
}