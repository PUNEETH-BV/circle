'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAssignments, Assignment } from '@/lib/hooks/useAssignments';
import { useCircle } from '@/lib/hooks/useCircle';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Calendar, 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Download, 
  Plus, 
  User, 
  RefreshCw, 
  ChevronRight, 
  FileCheck,
  ChevronDown
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatDate';

export default function AssignmentsPage() {
  const params = useParams();
  const circleId = params.circleId as string;
  const supabase = createClient();

  const { 
    assignments, 
    loading: assignmentsLoading, 
    createAssignment, 
    submitAssignment, 
    unsubmitAssignment,
    refreshAssignments
  } = useAssignments(circleId);

  const { userRole } = useCircle(circleId);
  const isAdmin = userRole === 'admin';

  // State for creating new assignment
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Selected assignment for viewing details/submissions
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  
  // Admin-specific: submission details for selected assignment
  const [memberSubmissions, setMemberSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // File Upload State
  const [uploadingFile, setUploadingFile] = useState<string | null>(null); // assignmentId
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);

  // Auto-select first assignment if any
  useEffect(() => {
    if (assignments.length > 0 && !selectedAssignmentId) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [assignments]);

  // Load submissions details for selected assignment when it changes (mainly for admin view)
  useEffect(() => {
    if (!selectedAssignmentId) return;
    
    async function loadSubmissions() {
      setLoadingSubmissions(true);
      try {
        // Fetch all members
        const { data: members, error: membersErr } = await supabase
          .from('circle_members')
          .select('*, profile:profiles(*)')
          .eq('circle_id', circleId);
        
        if (membersErr) throw membersErr;

        // Fetch submissions for this assignment
        const { data: submissions, error: subsErr } = await supabase
          .from('assignment_submissions')
          .select('*, profile:profiles(*)')
          .eq('assignment_id', selectedAssignmentId);

        if (subsErr) throw subsErr;

        const subsMap = new Map((submissions || []).map(s => [s.user_id, s]));

        const combined = (members || []).map(m => {
          const sub = subsMap.get(m.user_id);
          return {
            member: m.profile,
            role: m.role,
            submission: sub || null
          };
        });

        setMemberSubmissions(combined);
      } catch (err: any) {
        console.error('Error fetching assignment submissions details:', err);
        toast.error('Failed to load submission tracking details');
      } finally {
        setLoadingSubmissions(false);
      }
    }

    loadSubmissions();
  }, [selectedAssignmentId, assignments]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate) {
      toast.error('Please enter a title and select a due date');
      return;
    }

    setCreating(true);
    try {
      await createAssignment(newTitle, newDescription, new Date(newDueDate).toISOString());
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      setShowCreateForm(false);
      refreshAssignments();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleFileUpload = async (assignmentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    // 100MB upload size limit
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size exceeds the 100MB limit');
      return;
    }

    setUploadingFile(assignmentId);
    setUploadProgress(0);

    try {
      // 1. Request signed upload URL
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circleId,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { signedUrl, filePath } = await response.json();

      // 2. Upload file directly with XMLHttpRequest to track progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      // 3. Complete submission
      await submitAssignment(assignmentId, filePath);
      refreshAssignments();
    } catch (err: any) {
      console.error(err);
      toast.error('File upload failed: ' + err.message);
    } finally {
      setUploadingFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getStatusBadge = (assignment: Assignment) => {
    const isSubmitted = assignment.submission?.status === 'submitted';
    const isOverdue = new Date(assignment.due_date) < new Date();

    if (isSubmitted) {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5 px-2.5 py-1">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Submitted</span>
        </Badge>
      );
    }

    if (isOverdue) {
      return (
        <Badge className="bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1.5 px-2.5 py-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Overdue</span>
        </Badge>
      );
    }

    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5 px-2.5 py-1">
        <Clock className="w-3.5 h-3.5" />
        <span>Pending</span>
      </Badge>
    );
  };

  const getDownloadUrl = (filePath: string) => {
    return `${supabase.storage.from('circle-files').getPublicUrl(filePath).data.publicUrl}`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header bar */}
      <div className="flex justify-between items-center bg-white/60 backdrop-blur-md border border-white/20 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Assignments Workspace</h2>
          <p className="text-sm text-slate-500">Track deadlines, upload submissions, and manage tasks.</p>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </Button>
        )}
      </div>

      {/* Creation form modal/drawer */}
      {showCreateForm && (
        <div className="bg-white/80 backdrop-blur-md border border-slate-100 p-6 rounded-2xl shadow-md transition-all duration-300">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            <span>New Assignment Details</span>
          </h3>
          <form onSubmit={handleCreateAssignment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-700 font-medium">Assignment Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Midterm Lab Report"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-xl border-slate-200"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-slate-700 font-medium">Due Date & Time</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="rounded-xl border-slate-200"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-700 font-medium">Instructions & Guidelines</Label>
              <Textarea
                id="description"
                placeholder="Enter description, file templates or reference links..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="rounded-xl border-slate-200 min-h-[100px]"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl border-slate-200 text-slate-700"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={creating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm px-6"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Publish Assignment'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {assignmentsLoading ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-md border border-slate-100 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No assignments created yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {isAdmin ? 'Click "Create Assignment" to post the first task for this Circle.' : 'Excellent! There are no assignments for you at this moment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of assignments */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 px-1 uppercase tracking-wider">Assignments</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {assignments.map((assignment) => {
                const isSelected = assignment.id === selectedAssignmentId;
                return (
                  <div
                    key={assignment.id}
                    onClick={() => setSelectedAssignmentId(assignment.id)}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' 
                        : 'bg-white/60 hover:bg-white border-slate-100 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h4 className="font-semibold text-slate-800 line-clamp-1">{assignment.title}</h4>
                      {getStatusBadge(assignment)}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Due {formatDate(assignment.due_date)}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details / Workspace Panel */}
          <div className="lg:col-span-2">
            {selectedAssignment ? (
              <div className="bg-white/70 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedAssignment.title}</h3>
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Due Date: <span className="font-semibold text-slate-700">{formatDate(selectedAssignment.due_date)}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Published by: <span className="font-medium text-slate-600">{selectedAssignment.creator?.full_name || 'Admin'}</span>
                    </span>
                  </div>
                </div>

                {selectedAssignment.description && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Instructions</h4>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {selectedAssignment.description}
                    </p>
                  </div>
                )}

                {/* Submissions Section */}
                <div className="border-t border-slate-100 pt-6">
                  {isAdmin ? (
                    /* Admin view - lists all submissions */
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <FileCheck className="w-5 h-5 text-indigo-600" />
                          <span>Member Submission Tracker</span>
                        </h4>
                        <span className="text-xs text-slate-400">Real-time status updates</span>
                      </div>

                      {loadingSubmissions ? (
                        <div className="flex justify-center items-center py-6">
                          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                        </div>
                      ) : (
                        <div className="overflow-hidden border border-slate-100 rounded-xl">
                          <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                              <tr>
                                <th className="px-4 py-3">Student</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Submitted At</th>
                                <th className="px-4 py-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white/30">
                              {memberSubmissions.map((item, idx) => {
                                const hasSubmitted = item.submission?.status === 'submitted';
                                return (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-800 flex items-center gap-2 border-b border-slate-100">
                                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 uppercase">
                                        {item.member?.full_name ? item.member.full_name[0] : <User className="w-3.5 h-3.5" />}
                                      </div>
                                      <span>{item.member?.full_name || 'Loading...'}</span>
                                    </td>
                                    <td className="px-4 py-3 border-b border-slate-100">
                                      {hasSubmitted ? (
                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">Submitted</Badge>
                                      ) : (
                                        <Badge className="bg-slate-100 text-slate-500 border-slate-200">Pending</Badge>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs border-b border-slate-100">
                                      {hasSubmitted && item.submission.submitted_at 
                                        ? formatDate(item.submission.submitted_at) 
                                        : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right border-b border-slate-100">
                                      {hasSubmitted && item.submission.file_path && (
                                        <a 
                                          href={getDownloadUrl(item.submission.file_path)} 
                                          target="_blank" 
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          <span>Get File</span>
                                        </a>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Student view - allow uploading and status view */
                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-800">Your Submission</h4>
                      
                      {selectedAssignment.submission?.status === 'submitted' ? (
                        <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-xl space-y-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Submission Completed</span>
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {selectedAssignment.submission.file_path?.split('/').pop() || 'submitted_file'}
                              </p>
                              <p className="text-xs text-slate-500">
                                Submitted {formatDate(selectedAssignment.submission.submitted_at || '')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedAssignment.submission.file_path && (
                                <a 
                                  href={getDownloadUrl(selectedAssignment.submission.file_path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                                  title="Download Submitted File"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="rounded-lg"
                                onClick={() => unsubmitAssignment(selectedAssignment.id)}
                              >
                                Recall
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* File upload drag-and-drop zone */}
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-8 text-center cursor-pointer transition-colors duration-200 bg-slate-50/30 hover:bg-slate-50/60"
                          >
                            <input 
                              type="file"
                              ref={fileInputRef}
                              onChange={(e) => handleFileUpload(selectedAssignment.id, e)}
                              className="hidden"
                            />
                            
                            {uploadingFile === selectedAssignment.id ? (
                              <div className="space-y-3">
                                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                                <p className="text-sm font-semibold text-slate-700">Uploading File ({uploadProgress}%)</p>
                                <div className="w-full max-w-xs bg-slate-100 h-1.5 rounded-full overflow-hidden mx-auto">
                                  <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Upload className="w-10 h-10 text-slate-400 mx-auto" />
                                <p className="text-sm font-semibold text-slate-700">Select file or drag it here</p>
                                <p className="text-xs text-slate-500">Supports PDF, DOCX, ZIP and video files up to 100MB</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white/40 border border-slate-100 rounded-2xl p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">No assignment selected</h3>
                <p className="text-sm text-slate-500 mt-1">Select an assignment from the sidebar list to view instructions and submission details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
