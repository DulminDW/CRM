// ==============================================================================
// WINDOW COMPANIES CRM — EMPLOYEE MANAGEMENT PAGE
// Admin-only dashboard to view, invite, edit, activate/deactivate company employees,
// assign roles, and grant rate management capabilities.
// ==============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { EmployeeProfileRecord, CreateEmployeeInput, UserRole, UserPermissionKey } from '../types/employee';
import { fetchEmployees, createEmployee, updateEmployee, sendEmployeePasswordReset, deleteEmployee } from '../services/employeeService';

export const EmployeesPage: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';

  // State
  const [employees, setEmployees] = useState<EmployeeProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'STAFF'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeProfileRecord | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STAFF');
  const [department, setDepartment] = useState('OPERATIONS');
  const [phone, setPhone] = useState('');
  const [canManageRates, setCanManageRates] = useState(false);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Load employees
  const loadEmployeesData = useCallback(async () => {
    setLoading(true);
    const res = await fetchEmployees();
    setEmployees(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEmployeesData();
  }, [loadEmployeesData]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('STAFF');
    setDepartment('OPERATIONS');
    setPhone('');
    setCanManageRates(false);
    setFormError(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (emp: EmployeeProfileRecord) => {
    setEditingEmployee(emp);
    setFullName(emp.full_name);
    setEmail(emp.email || '');
    setRole(emp.role);
    setDepartment(emp.department || 'OPERATIONS');
    setPhone(emp.phone || '');
    setCanManageRates(emp.permissions?.includes('CAN_MANAGE_RATES') || false);
    setFormError(null);
    setModalOpen(true);
  };

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Please enter employee full name.');
      return;
    }
    if (!editingEmployee && (!email.trim() || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim()))) {
      setFormError('Please enter a valid work email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const permissions: UserPermissionKey[] = canManageRates ? ['CAN_MANAGE_RATES'] : [];

      if (editingEmployee) {
        // Update
        const res = await updateEmployee(editingEmployee.id, {
          full_name: fullName.trim(),
          role,
          department: department.trim(),
          phone: phone.trim() || undefined,
          permissions
        });

        if (res.error) {
          setFormError(res.error);
          return;
        }

        setSuccessBanner(`Employee ${fullName} updated successfully.`);
      } else {
        // Create
        const input: CreateEmployeeInput = {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim() || undefined,
          role,
          department: department.trim(),
          phone: phone.trim() || undefined,
          permissions
        };

        const res = await createEmployee(input);
        if (res.error) {
          setFormError(res.error);
          return;
        }

        setSuccessBanner(`Employee ${fullName} provisioned. Setup invitation initiated.`);
      }

      await loadEmployeesData();
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error saving employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active/inactive
  const handleToggleActive = async (emp: EmployeeProfileRecord) => {
    if (emp.id === profile?.id) {
      alert('You cannot deactivate your own administrative account.');
      return;
    }

    const nextState = !emp.is_active;
    const confirmMsg = nextState
      ? `Activate employee ${emp.full_name}?`
      : `Deactivate employee ${emp.full_name}? They will not be able to log in.`;

    if (!window.confirm(confirmMsg)) return;

    const res = await updateEmployee(emp.id, { is_active: nextState });
    if (res.error) {
      alert(`Error updating status: ${res.error}`);
    } else {
      setSuccessBanner(`Employee ${emp.full_name} status updated.`);
      await loadEmployeesData();
    }
  };

  // Trigger password reset
  const handleSendReset = async (emp: EmployeeProfileRecord) => {
    if (!emp.email) {
      alert('No email recorded for this employee.');
      return;
    }
    const res = await sendEmployeePasswordReset(emp.email);
    if (res.success) {
      setSuccessBanner(`Password reset link sent to ${emp.email}.`);
    } else {
      alert(`Could not send reset email: ${res.error}`);
    }
  };

  // Permanently delete employee
  const handleDeleteEmployee = async (emp: EmployeeProfileRecord) => {
    if (emp.full_name?.toLowerCase().includes('system administrator')) {
      alert('The System Administrator root account is protected and cannot be deleted.');
      return;
    }

    if (emp.id === profile?.id) {
      alert('You cannot delete your own administrative account.');
      return;
    }

    const confirmMsg = `Are you sure you want to permanently delete "${emp.full_name}"? This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    const res = await deleteEmployee(emp.id);
    if (res.success) {
      setSuccessBanner(`Employee ${emp.full_name} was deleted successfully.`);
      await loadEmployeesData();
    } else {
      alert(`Could not delete employee: ${res.error}`);
    }
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (roleFilter !== 'ALL' && emp.role !== roleFilter) return false;
      if (statusFilter !== 'ALL') {
        const isActive = statusFilter === 'ACTIVE';
        if (emp.is_active !== isActive) return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        emp.full_name.toLowerCase().includes(q) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q))
      );
    });
  }, [employees, roleFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9E0EA]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#1455D9] text-white rounded-xl shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-[#101828]">Employee Account Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1455D9] border border-blue-200">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-1">
            Manage internal company staff accounts, assign roles, grant rate permissions, and oversee account access.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs"
          >
            <UserPlus className="w-4 h-4" /> Add Company Employee
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 font-bold hover:underline"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#D9E0EA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by full name, department, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#D9E0EA] bg-[#F8FAFC] text-xs text-[#101828] focus:bg-white focus:ring-1 focus:ring-[#1455D9]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-lg border border-[#D9E0EA]">
            <span className="text-slate-500 font-semibold px-2">Role:</span>
            {(['ALL', 'ADMIN', 'STAFF'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  roleFilter === r ? 'bg-white text-[#1455D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-lg border border-[#D9E0EA]">
            <span className="text-slate-500 font-semibold px-2">Status:</span>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  statusFilter === s ? 'bg-white text-[#1455D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadEmployeesData}
            className="p-2 border border-[#D9E0EA] rounded-lg hover:bg-slate-50 text-slate-600"
            title="Refresh employees list"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="border border-[#D9E0EA] rounded-2xl overflow-x-auto bg-white shadow-xs">
        <table className="w-full min-w-[750px] text-left text-xs divide-y divide-[#D9E0EA]">
          <thead className="bg-[#F8FAFC] text-[#667085] font-semibold">
            <tr>
              <th className="p-4 min-w-[160px]">Employee Name</th>
              <th className="p-4 min-w-[140px]">Role &amp; Permissions</th>
              <th className="p-4 min-w-[110px]">Department</th>
              <th className="p-4 min-w-[100px]">Account Status</th>
              <th className="p-4 min-w-[130px]">Last Login</th>
              <th className="p-4 min-w-[100px]">Created Date</th>
              <th className="p-4 text-right min-w-[110px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9E0EA] bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Loading company employees...
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 space-y-2">
                  <p>No company employees found matching active filters.</p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleOpenCreateModal}
                      className="text-xs text-[#1455D9] font-bold underline inline-flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add an internal employee now
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const isCurrentSelf = emp.id === profile?.id;
                const hasRatePerm = emp.permissions?.includes('CAN_MANAGE_RATES');

                return (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-[#101828]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1455D9] flex items-center justify-center font-bold">
                          {emp.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{emp.full_name}</span>
                            {isCurrentSelf && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                                (You)
                              </span>
                            )}
                          </div>
                          {emp.email && <span className="text-[11px] font-normal text-slate-500">{emp.email}</span>}
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            emp.role === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {emp.role}
                        </span>

                        {hasRatePerm && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Rates Manager
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-slate-700 font-medium">{emp.department || 'OPERATIONS'}</td>

                    <td className="p-4">
                      {emp.is_active ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1">
                          <UserX className="w-3 h-3" /> Deactivated
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-xs text-slate-500 font-medium">
                      {emp.last_login_at ? (
                        <span className="text-slate-700">{new Date(emp.last_login_at).toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400 italic">Never logged in</span>
                      )}
                    </td>

                    <td className="p-4 text-slate-500">{new Date(emp.created_at).toLocaleDateString()}</td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {emp.email && (
                          <button
                            type="button"
                            onClick={() => handleSendReset(emp)}
                            className="p-1.5 rounded-lg border border-[#D9E0EA] hover:bg-slate-100 text-slate-600"
                            title="Send Password Reset Link"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 rounded-lg border border-[#D9E0EA] hover:bg-slate-100 text-[#1455D9]"
                          title="Edit Employee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {!isCurrentSelf && !emp.full_name?.toLowerCase().includes('system administrator') && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(emp)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                emp.is_active
                                  ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {emp.is_active ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(emp)}
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                              title="Delete Employee"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#D9E0EA] shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-[#D9E0EA] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#1455D9]" />
                <h3 className="font-bold text-sm text-[#101828]">
                  {editingEmployee ? `Edit Employee: ${editingEmployee.full_name}` : 'Add New Company Employee'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employee Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Sarah Perera"
                  className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-[#101828] focus:ring-1 focus:ring-[#1455D9]"
                />
              </div>

              {!editingEmployee && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Company Work Email *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@windowcompanies.com"
                      className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-[#101828] focus:ring-1 focus:ring-[#1455D9]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Password</label>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter employee password"
                      className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] text-[#101828] focus:ring-1 focus:ring-[#1455D9]"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Assignment *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC] text-[#101828] font-bold"
                  >
                    <option value="STAFF">STAFF (Standard Access)</option>
                    <option value="ADMIN">ADMIN (Full System Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[#D9E0EA] bg-[#F8FAFC] text-[#101828]"
                  >
                    <option value="OPERATIONS">OPERATIONS</option>
                    <option value="SALES & MARKETING">SALES &amp; MARKETING</option>
                    <option value="CONTRACTING">CONTRACTING</option>
                    <option value="MANAGEMENT">MANAGEMENT</option>
                  </select>
                </div>
              </div>

              {/* Granular Permission Toggles */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-[11px]">Granular Permissions</span>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canManageRates || role === 'ADMIN'}
                    disabled={role === 'ADMIN'}
                    onChange={(e) => setCanManageRates(e.target.checked)}
                    className="w-4 h-4 text-[#1455D9] rounded"
                  />
                  <span className="text-slate-700 font-medium">
                    Authorize Rate Management (Create &amp; Publish Hotel Rates)
                  </span>
                </label>
                {role === 'ADMIN' && (
                  <span className="text-[10px] text-purple-700 font-semibold block">
                    Admin role automatically holds full rate management authority.
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9E0EA]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#1455D9] hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingEmployee ? 'Save Changes' : 'Provision Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

