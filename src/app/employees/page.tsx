"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, Plane, Circle } from "lucide-react";
import type { Employee, Attendance } from "@/lib/types";

export default function EmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Record<string, Attendance>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const isAdminOrHR = user?.role === "admin" || user?.role === "hr";

  useEffect(() => {
    fetchEmployees();
    fetchTodayAttendance();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/attendance?date=${today}`);
      const data = await res.json();
      const attendanceMap: Record<string, Attendance> = {};
      (data.attendance || []).forEach((a: Attendance) => {
        attendanceMap[a.employee_id] = a;
      });
      setTodayAttendance(attendanceMap);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIndicator = (employeeId: string) => {
    const attendance = todayAttendance[employeeId];
    if (!attendance) {
      return <Circle className="w-3 h-3 fill-yellow-400 text-yellow-400" title="Absent" />;
    }
    if (attendance.status === "leave") {
      return <Plane className="w-4 h-4 text-blue-500" title="On Leave" />;
    }
    if (attendance.status === "present" || attendance.check_in) {
      return <Circle className="w-3 h-3 fill-green-500 text-green-500" title="Present" />;
    }
    return <Circle className="w-3 h-3 fill-yellow-400 text-yellow-400" title="Absent" />;
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
              {isAdminOrHR && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Add Employee</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEmployees.map((employee) => (
                <Link
                  key={employee.id}
                  href={`/employees/${employee.id}`}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition group"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                        {employee.profile_picture ? (
                          <img
                            src={employee.profile_picture}
                            alt=""
                            className="w-14 h-14 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-medium text-primary-700">
                            {employee.first_name[0]}
                            {employee.last_name[0]}
                          </span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                        {getStatusIndicator(employee.id)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-600">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {employee.designation || "No designation"}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-1">
                        {employee.department || "No department"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No employees found</p>
            </div>
          )}
        </div>

        {showAddModal && (
          <AddEmployeeModal
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              fetchEmployees();
            }}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function AddEmployeeModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    department: "",
    designation: "",
    joining_date: new Date().toISOString().split("T")[0],
    role: "employee",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<{ loginId: string; tempPassword: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create employee");
      }

      setCredentials(data.credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  if (credentials) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Employee Created!</h2>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800 mb-2">Share these credentials with the employee:</p>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-green-600">Login ID:</span>
                <p className="font-mono font-bold text-green-900">{credentials.loginId}</p>
              </div>
              <div>
                <span className="text-xs text-green-600">Temporary Password:</span>
                <p className="font-mono font-bold text-green-900">{credentials.tempPassword}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            The employee will be required to change their password on first login.
          </p>
          <button
            onClick={onSuccess}
            className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Employee</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Joining Date *
              </label>
              <input
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="employee">Employee</option>
                <option value="hr">HR Officer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
