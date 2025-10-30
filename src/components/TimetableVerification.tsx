import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Trash2, Plus, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface TimetableVerificationProps {
  data: Array<{
    day: string;
    startTime: string;
    endTime: string;
    courseCode: string;
    courseName?: string;
    instructor?: string;
    instructorCode: string;
    room?: string;
  }>;
  isOpen: boolean;
  onApprove: (correctedData: any[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function TimetableVerification({ data, isOpen, onApprove, onCancel, isLoading = false }: TimetableVerificationProps) {
  const [entries, setEntries] = useState(data);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<any>(null);

  const handleEdit = (index: number, entry: any) => {
    setEditingId(index);
    setEditingData({ ...entry });
  };

  const handleSaveEdit = (index: number) => {
    const updated = [...entries];
    updated[index] = editingData;
    setEntries(updated);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData(null);
  };

  const handleDeleteRow = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleAddRow = () => {
    setEntries([
      ...entries,
      {
        day: 'monday',
        startTime: '09:00',
        endTime: '10:00',
        courseCode: '',
        instructorCode: '',
        courseName: '',
        room: ''
      }
    ]);
  };

  const handleApprove = () => {
    const validEntries = entries.filter(entry => 
      entry.courseCode?.trim() && 
      entry.day && 
      entry.startTime && 
      entry.endTime &&
      entry.instructorCode?.trim()
    );
    
    if (validEntries.length === 0) {
      alert('Please ensure at least one row has all required fields: Day, Time, Course Code, and Instructor Code');
      return;
    }

    onApprove(validEntries);
  };

  const issuesCount = entries.filter(entry => 
    !entry.courseCode?.trim() || 
    !entry.day || 
    !entry.startTime || 
    !entry.endTime ||
    !entry.instructorCode?.trim()
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verify Parsed Timetable Data</DialogTitle>
          <DialogDescription>
            Review and correct the extracted entries. All fields are required. You can edit, delete, or add rows.
          </DialogDescription>
        </DialogHeader>

        {/* Issues Alert */}
        {issuesCount > 0 && (
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Issues Found</AlertTitle>
            <AlertDescription>
              {issuesCount} row(s) are incomplete or missing required fields
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-xs font-semibold text-blue-600">Total Entries</div>
            <div className="text-2xl font-bold text-blue-900">{entries.length}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="text-xs font-semibold text-green-600">Valid</div>
            <div className="text-2xl font-bold text-green-900">{entries.length - issuesCount}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="text-xs font-semibold text-yellow-600">Issues</div>
            <div className="text-2xl font-bold text-yellow-900">{issuesCount}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded p-3">
            <div className="text-xs font-semibold text-purple-600">Instructors</div>
            <div className="text-2xl font-bold text-purple-900">
              {new Set(entries.filter(e => e.instructorCode).map(e => e.instructorCode)).size}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="min-w-24">Day</TableHead>
                  <TableHead className="min-w-20">Start</TableHead>
                  <TableHead className="min-w-20">End</TableHead>
                  <TableHead className="min-w-32">Course Code</TableHead>
                  <TableHead className="min-w-32">Instructor Code</TableHead>
                  <TableHead className="min-w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No entries to verify
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry, index) => {
                    const isInvalid = 
                      !entry.courseCode?.trim() || 
                      !entry.day || 
                      !entry.startTime || 
                      !entry.endTime ||
                      !entry.instructorCode?.trim();

                    return (
                      <TableRow key={index} className={isInvalid ? 'bg-red-50' : ''}>
                        {editingId === index ? (
                          <>
                            <TableCell>
                              <Select value={editingData.day} onValueChange={(val) => setEditingData({ ...editingData, day: val })}>
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DAYS.map(day => (
                                    <SelectItem key={day} value={day}>
                                      {day.charAt(0).toUpperCase() + day.slice(1)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="time"
                                value={editingData.startTime}
                                onChange={(e) => setEditingData({ ...editingData, startTime: e.target.value })}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="time"
                                value={editingData.endTime}
                                onChange={(e) => setEditingData({ ...editingData, endTime: e.target.value })}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={editingData.courseCode}
                                onChange={(e) => setEditingData({ ...editingData, courseCode: e.target.value })}
                                className="h-8"
                                placeholder="Required"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={editingData.instructorCode}
                                onChange={(e) => setEditingData({ ...editingData, instructorCode: e.target.value })}
                                className="h-8"
                                placeholder="Required"
                              />
                            </TableCell>
                            <TableCell className="space-x-1">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSaveEdit(index)}
                                className="h-7 px-2"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                className="h-7 px-2"
                              >
                                Cancel
                              </Button>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-medium">
                              {entry.day.charAt(0).toUpperCase() + entry.day.slice(1)}
                            </TableCell>
                            <TableCell className="text-sm">{entry.startTime}</TableCell>
                            <TableCell className="text-sm">{entry.endTime}</TableCell>
                            <TableCell className={`font-mono text-sm ${!entry.courseCode?.trim() ? 'text-red-600 font-bold' : ''}`}>
                              {entry.courseCode || '⚠️ Missing'}
                            </TableCell>
                            <TableCell className={`font-mono text-sm ${!entry.instructorCode?.trim() ? 'text-red-600 font-bold' : ''}`}>
                              {entry.instructorCode || '⚠️ Missing'}
                            </TableCell>
                            <TableCell className="space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(index, entry)}
                                className="h-7 px-2"
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteRow(index)}
                                className="h-7 px-2"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Add Row Button */}
        <Button
          onClick={handleAddRow}
          variant="outline"
          className="w-full mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Row
        </Button>

        {/* Footer */}
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={entries.length === 0 || issuesCount > 0 || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Confirm & Upload to Database'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
