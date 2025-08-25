import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { School, MapPin, Phone, Mail, Globe, Users, GraduationCap, Building2 } from "lucide-react";

export default function University() {
  return (
    <div className="space-y-6">
      {/* University Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <School className="w-5 h-5 mr-2 text-primary" />
            University Overview
          </CardTitle>
          <CardDescription>
            Manage your university information and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="uni-name">University Name</Label>
              <Input id="uni-name" defaultValue="Stanford University" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uni-code">University Code</Label>
              <Input id="uni-code" defaultValue="STU" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" defaultValue="America/Los_Angeles" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Contact Email</Label>
              <Input id="contact-email" defaultValue="admin@stanford.edu" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="location">Location</Label>
            <Textarea id="location" defaultValue="Stanford, California, USA" className="resize-none" />
          </div>
          <div className="mt-6 flex justify-end">
            <Button>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">2,847</div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-success rounded-lg flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">156</div>
                <div className="text-sm text-muted-foreground">Faculty Members</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">8</div>
                <div className="text-sm text-muted-foreground">Buildings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-warning rounded-lg flex items-center justify-center">
                <School className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">15</div>
                <div className="text-sm text-muted-foreground">Programs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="w-5 h-5 mr-2 text-primary" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Address</div>
                  <div className="text-sm text-muted-foreground">450 Serra Mall, Stanford, CA 94305</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Phone</div>
                  <div className="text-sm text-muted-foreground">+1 (650) 723-2300</div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-sm text-muted-foreground">admin@stanford.edu</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Website</div>
                  <div className="text-sm text-muted-foreground">www.stanford.edu</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* University Status */}
      <Card>
        <CardHeader>
          <CardTitle>University Status</CardTitle>
          <CardDescription>Current operational status and settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">University Status</div>
              <div className="text-sm text-muted-foreground">All systems operational</div>
            </div>
            <Badge variant="default" className="bg-green-600">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
