"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Check, X, Calendar, FileText } from "lucide-react";
import type { LeaveRequest, LeaveType, LeaveBalance, Employee } from "@/lib/types";

export default function LeavePage() {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<(LeaveRequest & { employee?: Employee; leave_type?: LeaveType })[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"my" | "pending" | "all">("my");

  const isAdminOrHR = user?.role === "admin" || user?.role === "hr";

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveTypes();
    fetchLeaveBalances();
  }, [activeTab]);

  const fetchLeaveRequests = async () => {
    try {
      let url = "/api/leave";
      if (activeTab === "pending") {
        url += "?status=pending";
      } else if (activeTab === "my") {
        url += `?employeeId=${user?.id}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setLeaveRequests(data.leaveRequests || []);
    } catch (error) {
      console.error("Failed to fetch leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await fetch("/api/leave-types");
      const data = await res.json();
      setLeaveTypes(data.leaveTypes || []);
    } catch (error) {
      console.error("Failed to fetch leave types:", error);
    }
  };

  const fetchLeaveBalances = async () => {
    try {
      const res = await fetch(`/api/leave-balances?employeeId=${user?.id}`);
      const data = await res.json();
      setLeaveBalances(data.leaveBalances || []);
    } catch (error) {
      console.error("Failed to fetch leave balances:", error);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      if (res.ok) {
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error("Failed to approve leave:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (res.ok) {
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error("Failed to reject leave:", error);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              <Plus size={18} />
              Apply for Leave
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              {isAdminOrHR && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActiveTab("my")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeTab === "my"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    My Leaves
                  </button>
                  <button
                    onClick={() => setActiveTab("pending")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeTab === "pending"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Pending Requests
                  </button>
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeTab === "all"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    All Requests
                  </button>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : leaveRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No leave requests found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {leaveRequests.map((request) => (
                      <div key={request.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            {(activeTab !== "my" && request.employee) && (
                              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-sm font-medium text-primary-700">
                                {request.employee.first_name?.[0]}
                                {request.employee.last_name?.[0]}
                              </div>
                            )}
                            <div>
                              {(activeTab !== "my" && request.employee) && (
                                <p className="font-medium text-gray-900">
                                  {request.employee.first_name} {request.employee.last_name}
                                </p>
                              )}
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">{request.leave_type?.name}</span>
                                {" • "}
                                {request.days} day{request.days > 1 ? "s" : ""}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(request.start_date), "MMM d, yyyy")}
                                {request.start_date !== request.end_date &&
                                  ` - ${format(new Date(request.end_date), "MMM d, yyyy")}`}
                              </p>
                              {request.reason && (
                                <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                              )}
                              {request.attachment_url && (
                                <a
                                  href={request.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline mt-1"
                                >
                                  <FileText size={12} />
                                  View Attachment
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                request.status === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : request.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {request.status}
                            </span>
                            {isAdminOrHR && request.status === "pending" && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleApprove(request.id)}
                                  className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                                  title="Approve"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => handleReject(request.id)}
                                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                                  title="Reject"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Balance</h3>
                <div className="space-y-4">
                  {leaveBalances.length === 0 ? (
                    <p className="text-gray-500 text-sm">No leave balances found</p>
                  ) : (
                    leaveBalances.map((balance) => {
                      const leaveType = leaveTypes.find((lt) => lt.id === balance.leave_type_id);
                      const remaining = balance.total_days - balance.used_days;
                      const percentage = (remaining / balance.total_days) * 100;
                      return (
                        <div key={balance.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{leaveType?.name || "Unknown"}</span>
                            <span className="font-medium">
                              {remaining} / {balance.total_days}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percentage > 50
                                  ? "bg-green-500"
                                  : percentage > 25
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Types</h3>
                <div className="space-y-3">
                  {leaveTypes.map((type) => (
                    <div key={type.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{type.name}</p>
                        <p className="text-xs text-gray-500">
                          {type.max_days_per_year} days/year
                          {type.is_paid ? " • Paid" : " • Unpaid"}
                        </p>
                      </div>
                      {type.requires_attachment && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          Doc Required
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showAddModal && (
          <ApplyLeaveModal
            leaveTypes={leaveTypes}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              fetchLeaveRequests();
              fetchLeaveBalances();
            }}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function ApplyLeaveModal({
  leaveTypes,
  onClose,
  onSuccess,
}: {
  leaveTypes: LeaveType[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedType = leaveTypes.find((lt) => lt.id === formData.leave_type_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to apply for leave");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply for leave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Apply for Leave</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Type *
            </label>
            <select
              value={formData.leave_type_id}
              onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900"
              required
            >
              <option value="">Select leave type...</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.max_days_per_year} days)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                min={formData.start_date || new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none text-gray-900 placeholder:text-gray-500"
              placeholder="Optional reason for leave..."
            />
          </div>

          {selectedType?.requires_attachment && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-700">
                This leave type requires a supporting document (e.g., medical certificate).
              </p>
            </div>
          )}

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
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
