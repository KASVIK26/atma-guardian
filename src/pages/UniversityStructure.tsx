import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/layout/Navbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Plus,
  ChevronRight,
  ChevronDown,
  Users,
  BookOpen,
  GraduationCap,
  Edit,
  Trash2,
  Calendar,
  MapPin
} from "lucide-react";

interface Section {
  id: string;
  name: string;
  students: number;
  teacher?: string;
}

interface Year {
  id: string;
  name: string;
  sections: Section[];
}

interface Branch {
  id: string;
  name: string;
  years: Year[];
}

interface Program {
  id: string;
  name: string;
  branches: Branch[];
  totalStudents: number;
}

export default function UniversityStructure() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const programs: Program[] = [
    {
      id: "cs",
      name: "Computer Science",
      totalStudents: 1247,
      branches: [
        {
          id: "cs-se",
          name: "Software Engineering",
          years: [
            {
              id: "cs-se-1",
              name: "1st Year",
              sections: [
                { id: "cs-se-1-a", name: "Section A", students: 45, teacher: "Dr. Smith" },
                { id: "cs-se-1-b", name: "Section B", students: 42, teacher: "Dr. Johnson" }
              ]
            },
            {
              id: "cs-se-2",
              name: "2nd Year",
              sections: [
                { id: "cs-se-2-a", name: "Section A", students: 38, teacher: "Dr. Williams" },
                { id: "cs-se-2-b", name: "Section B", students: 41, teacher: "Dr. Brown" }
              ]
            }
          ]
        },
        {
          id: "cs-ds",
          name: "Data Science",
          years: [
            {
              id: "cs-ds-1",
              name: "1st Year", 
              sections: [
                { id: "cs-ds-1-a", name: "Section A", students: 35, teacher: "Dr. Davis" }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "business",
      name: "Business Administration",
      totalStudents: 892,
      branches: [
        {
          id: "ba-mgmt",
          name: "Management",
          years: [
            {
              id: "ba-mgmt-1",
              name: "1st Year",
              sections: [
                { id: "ba-mgmt-1-a", name: "Section A", students: 48, teacher: "Prof. Wilson" },
                { id: "ba-mgmt-1-b", name: "Section B", students: 46, teacher: "Prof. Taylor" }
              ]
            }
          ]
        }
      ]
    }
  ];

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const renderTreeItem = (
    item: any,
    level: number,
    type: "program" | "branch" | "year" | "section",
    icon: React.ReactNode
  ) => {
    const hasChildren = 
      (type === "program" && item.branches?.length > 0) ||
      (type === "branch" && item.years?.length > 0) ||
      (type === "year" && item.sections?.length > 0);

    const isExpanded = expandedItems.has(item.id);

    return (
      <div key={item.id}>
        <motion.div
          className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer border border-transparent hover:border-border/50`}
          style={{ marginLeft: `${level * 24}px` }}
          whileHover={{ scale: 1.01 }}
          onClick={() => hasChildren && toggleExpanded(item.id)}
        >
          <div className="flex items-center space-x-3">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(item.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              {icon}
            </div>
            
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-muted-foreground">
                {type === "program" && `${item.totalStudents} students`}
                {type === "section" && `${item.students} students`}
                {type === "section" && item.teacher && ` • ${item.teacher}`}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {type === "section" && (
              <>
                <Badge variant="outline">{item.students}</Badge>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Calendar className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem({ ...item, type });
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm" 
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {type === "program" && item.branches?.map((branch: Branch) =>
              renderTreeItem(branch, level + 1, "branch", <BookOpen className="h-4 w-4 text-white" />)
            )}
            {type === "branch" && item.years?.map((year: Year) =>
              renderTreeItem(year, level + 1, "year", <GraduationCap className="h-4 w-4 text-white" />)
            )}
            {type === "year" && item.sections?.map((section: Section) =>
              renderTreeItem(section, level + 1, "section", <Users className="h-4 w-4 text-white" />)
            )}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen dark bg-background">
      <Navbar showProfileMenu />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">University Structure</h1>
            <p className="text-muted-foreground">
              Manage your academic programs, branches, years, and sections
            </p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="glow">
                <Plus className="w-4 h-4 mr-2" />
                Add Program
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Program</DialogTitle>
                <DialogDescription>
                  Create a new academic program for your university
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="programName">Program Name</Label>
                  <Input id="programName" placeholder="e.g., Computer Science" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programCode">Program Code</Label>
                  <Input id="programCode" placeholder="e.g., CS" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button variant="glow">Create Program</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Tree View */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <GraduationCap className="w-5 h-5 mr-2 text-primary" />
                    Academic Structure
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {programs.map((program) =>
                    renderTreeItem(
                      program,
                      0,
                      "program",
                      <GraduationCap className="h-4 w-4 text-white" />
                    )
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Details Panel */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Programs</span>
                    <span className="font-bold text-xl">2</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Branches</span>
                    <span className="font-bold text-xl">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Sections</span>
                    <span className="font-bold text-xl">7</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Students</span>
                    <span className="font-bold text-xl">2,139</span>
                  </div>
                </CardContent>
              </Card>

              {selectedItem && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedItem.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={selectedItem.name} />
                    </div>
                    
                    {selectedItem.type === "section" && (
                      <>
                        <div className="space-y-2">
                          <Label>Assigned Teacher</Label>
                          <Input value={selectedItem.teacher || ""} />
                        </div>
                        <div className="space-y-2">
                          <Label>Student Count</Label>
                          <Input value={selectedItem.students} type="number" />
                        </div>
                      </>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" className="flex-1">
                        Cancel
                      </Button>
                      <Button variant="glow" className="flex-1">
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Bulk Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="w-4 h-4 mr-2" />
                    Import Students CSV
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    Import Timetable
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <MapPin className="w-4 h-4 mr-2" />
                    Assign Classrooms
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}