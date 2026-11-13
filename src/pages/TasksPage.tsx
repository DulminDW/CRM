// ==============================================================================
// WINDOW COMPANIES CRM — EMPLOYEE DAILY TASKS PAGE
// Task dashboard supporting Admin task assignment and Staff daily work tracking.
// ==============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  AlertTriangle,
  Calendar,
  User,
  AlertOctagon,
  X,
  RotateCcw,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  DailyTaskRecord,
  CreateTaskInput,
  TaskPriority,
  TaskStatus,
  TaskCategory,
  TaskCommentRecord
} from '../types/task';
import { EmployeeProfileRecord } from '../types/employee';
import { fetchTasks, createTask, updateTaskStatus, fetchTaskComments } from '../services/taskService';
import { fetchEmployees } from '../services/employeeService';

export const TasksPage: React.FC = () => {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  // Task State
  const [tasks, setTasks] = useState<DailyTaskRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL');

  // Modal State: Create Task
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formPriority, setFormPriority] = useState<TaskPriority>('MEDIUM');
  const [formCategory, setFormCategory] = useState<TaskCategory>('GENERAL');
  const [formInstructions, setFormInstructions] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State: View / Update Task
  const [selectedTask, setSelectedTask] = useState<DailyTaskRecord | null>(null);
  const [taskComments, setTaskComments] = useState<TaskCommentRecord[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isBlocker, setIsBlocker] = useState(false);
  const [newStatus, setNewStatus] = useState<TaskStatus>('IN_PROGRESS');

  // Load data
  const loadTasksData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [tasksRes, empsRes] = await Promise.all([
      fetchTasks(user.id, isAdmin),
      fetchEmployees()
    ]);
    setTasks(tasksRes.data);
    setEmployees(empsRes.data.filter((e) => e.is_active));
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => {
    loadTasksData();
  }, [loadTasksData]);

  // Load comments when task is inspected
  const handleInspectTask = async (task: DailyTaskRecord) => {
    setSelectedTask(task);
    setNewStatus(task.status);
    setNewComment('');
    setIsBlocker(false);
    const commentsRes = await fetchTaskComments(task.id);
    setTaskComments(commentsRes.data);
  };

  // Submit new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Please enter a task title.');
      return;
    }
    if (!formAssignedTo) {
      setFormError('Please select an employee to assign this task.');
      return;
    }
    if (!formDueDate) {
      setFormError('Please select a due date.');
      return;
    }

    try {
      setIsSubmitting(true);
      const input: CreateTaskInput = {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        assigned_to: formAssignedTo,
        due_date: formDueDate,
        priority: formPriority,
        category: formCategory,
        instructions: formInstructions.trim() || undefined
      };

      const res = await createTask(input, user.id);
      if (res.error) {
        setFormError(res.error);
        return;
      }

      setCreateModalOpen(false);
      setFormTitle('');
      setFormDescription('');
      setFormInstructions('');
      await loadTasksData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error creating task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update status / comment
  const handleUpdateStatus = async () => {
    if (!selectedTask || !user) return;

    const res = await updateTaskStatus(
      selectedTask.id,
      {
        status: newStatus,
        comment: newComment.trim() || undefined,
        is_blocker: isBlocker
      },
      user.id
    );

    if (res.error) {
      alert(`Error updating task: ${res.error}`);
    } else {
      setSelectedTask(null);
      await loadTasksData();
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === 'PENDING').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const todayStr = new Date().toISOString().split('T')[0] || '';
    const overdue = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.due_date < todayStr).length;

    return { total, pending, inProgress, completed, overdue };
  }, [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (assignedFilter !== 'ALL' && t.assigned_to !== assignedFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assignee?.full_name && t.assignee.full_name.toLowerCase().includes(q))
      );
    });
  }, [tasks, statusFilter, priorityFilter, assignedFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9E0EA]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#1455D9] text-white rounded-xl shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-[#101828]">Employee Daily Task Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1455D9] border border-blue-200">
              {isAdmin ? 'Admin Overview' : 'Assigned Work'}
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-1">
            {isAdmin
              ? 'Assign, track, and supervise daily operational tasks across company staff members.'
              : 'Track and update daily assignments, report blockers, and submit completed work.'}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setFormAssignedTo(employees[0]?.id || '');
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              setFormDueDate(tomorrow.toISOString().split('T')[0] || '');
              setCreateModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Create &amp; Assign Task
          </button>
        )}
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Tasks', count: metrics.total, color: 'bg-slate-50 text-slate-800' },
          { label: 'Pending', count: metrics.pending, color: 'bg-blue-50 text-[#1455D9]' },
          { label: 'In Progress', count: metrics.inProgress, color: 'bg-amber-50 text-amber-800' },
          { label: 'Completed', count: metrics.completed, color: 'bg-emerald-50 text-emerald-800' },
          { label: 'Overdue Tasks', count: metrics.overdue, color: 'bg-red-50 text-red-800 font-bold' }
        ].map((m) => (
          <div key={m.label} className={`p-4 rounded-2xl border border-[#D9E0EA] ${m.color} text-center`}>
            <div className="text-xl font-bold">{m.count}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#D9E0EA] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tasks by title, instructions, employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs text-[#101828] focus:bg-white focus:ring-1 focus:ring-[#1455D9]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | TaskStatus)}
            className="h-9 px-3 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | TaskPriority)}
            className="h-9 px-3 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Assignee Filter (Admin view) */}
          {isAdmin && (
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={loadTasksData}
            className="p-2 border border-[#D9E0EA] rounded-lg hover:bg-slate-50 text-slate-600"
            title="Refresh tasks"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task List Table */}
      <div className="border border-[#D9E0EA] rounded-2xl overflow-hidden bg-white shadow-xs">
        <table className="w-full text-left text-xs divide-y divide-[#D9E0EA]">
          <thead className="bg-[#F8FAFC] text-[#667085] font-semibold">
            <tr>
              <th className="p-4">Task Details</th>
              <th className="p-4">Assigned Employee</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9E0EA] bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Loading tasks...
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No tasks found matching active criteria.
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => {
                const todayStr = new Date().toISOString().split('T')[0] || '';
                const isOverdue = task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && task.due_date < todayStr;

                return (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-[#101828] text-sm">{task.title}</div>
                      {task.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                      )}
                      <span className="inline-block mt-1 text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                        {task.category}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-semibold text-[#101828]">
                        <User className="w-3.5 h-3.5 text-[#1455D9]" />
                        <span>{task.assignee?.full_name || 'Unassigned'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{task.assignee?.department || 'Operations'}</span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          task.priority === 'URGENT'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : task.priority === 'HIGH'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : task.priority === 'MEDIUM'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{task.due_date}</span>
                      </div>
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> Overdue
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : task.status === 'ON_HOLD'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : task.status === 'CANCELLED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleInspectTask(task)}
                        className="px-3 py-1.5 rounded-lg border border-[#D9E0EA] hover:bg-slate-100 text-[#1455D9] font-bold text-xs"
                      >
                        Inspect &amp; Update
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE TASK MODAL (ADMIN ONLY) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-[#D9E0EA] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#1455D9]" />
                <h3 className="font-bold text-sm text-[#101828]">Create &amp; Assign Daily Work Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Follow up 2027 Summer rates with Jetwing UK desk"
                  className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-[#101828] focus:ring-1 focus:ring-[#1455D9]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign to Employee *</label>
                <select
                  required
                  value={formAssignedTo}
                  onChange={(e) => setFormAssignedTo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC] text-[#101828] font-bold"
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.department || 'Operations'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-[#101828]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC] text-[#101828]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as TaskCategory)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC] text-[#101828]"
                  >
                    <option value="GENERAL">General</option>
                    <option value="RATE_DISTRIBUTION">Rate Sharing</option>
                    <option value="CONTRACT_FOLLOWUP">Contract</option>
                    <option value="AGENCY_VISIT">Agency Visit</option>
                    <option value="SPECIAL_DEAL">Special Deal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instructions / Description</label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Provide detailed instructions or relevant notes..."
                  className="w-full p-3 rounded-xl border border-[#D9E0EA] text-[#101828]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9E0EA]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT & UPDATE TASK MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-[#D9E0EA] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">{selectedTask.category}</span>
                <h3 className="font-bold text-sm text-[#101828]">{selectedTask.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Task Overview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned To:</span>
                  <strong className="text-[#101828]">{selectedTask.assignee?.full_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Due Date:</span>
                  <strong className="text-[#101828]">{selectedTask.due_date}</strong>
                </div>
                {selectedTask.instructions && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block mb-0.5">Instructions:</span>
                    <p className="text-slate-700">{selectedTask.instructions}</p>
                  </div>
                )}
              </div>

              {/* Status Update Form */}
              <div className="space-y-3 pt-2">
                <label className="block font-bold text-slate-800">Update Task Progress</label>

                <div>
                  <label className="block text-slate-600 mb-1">New Status:</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC] font-bold text-[#101828]"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="ON_HOLD">ON HOLD</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Progress Notes / Comment:</label>
                  <textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Describe progress, next steps, or status changes..."
                    className="w-full p-2.5 rounded-xl border border-[#D9E0EA] text-[#101828]"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBlocker}
                    onChange={(e) => setIsBlocker(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <span className="text-red-700 font-bold flex items-center gap-1">
                    <AlertOctagon className="w-3.5 h-3.5" /> Flag as blocker for Management attention
                  </span>
                </label>
              </div>

              {/* Comments Timeline */}
              {taskComments.length > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block">Activity &amp; Comments Timeline</span>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {taskComments.map((c) => (
                      <div
                        key={c.id}
                        className={`p-2.5 rounded-lg border text-[11px] ${
                          c.is_blocker
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex justify-between font-bold text-[10px] mb-1">
                          <span>{c.author?.full_name || 'Staff Member'}</span>
                          <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p>{c.comment_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9E0EA]">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  className="px-5 py-2.5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" /> Save Status Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

