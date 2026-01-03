"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Clock, LogIn, LogOut, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { Attendance, Employee } from "@/lib/types";

export default function AttendancePage() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [monthlyAttendance, setMonthlyAttendance] = useState<Attendance[]>([]);
  const [allAttendance, setAllAttendance] = useState<(Attendance & { employee: Employee })[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdminOrHR = user?.role === "admin" || user?.role === "hr";
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetchTodayAttendance();
    fetchMonthlyAttendance();
    if (isAdminOrHR) {
      fetchAllAttendance();
    }
  }, [currentMonth, currentYear]);

  const fetchTodayAttendance = async () => {
    try {
      const res = await fetch(`/api/attendance?date=${today}&employeeId=${user?.id}`);
      const data = await res.json();
      const todayRecord = data.attendance?.find((a: Attendance) => a.date === today);
      setTodayAttendance(todayRecord || null);
    } catch (error) {
      console.error("Failed to fetch today's attendance:", error);
    }
  };

  const fetchMonthlyAttendance = async () => {
    try {
      const res = await fetch(`/api/attendance?month=${currentMonth}&year=${currentYear}&employeeId=${user?.id}`);
      const data = await res.json();
      setMonthlyAttendance(data.attendance || []);
    } catch (error) {
      console.error("Failed to fetch monthly attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAttendance = async () => {
    try {
      const res = await fetch(`/api/attendance?date=${today}`);
      const data = await res.json();
      setAllAttendance(data.attendance || []);
    } catch (error) {
      console.error("Failed to fetch all attendance:", error);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_in" }),
      });

      if (res.ok) {
        const data = await res.json();
        setTodayAttendance(data.attendance);
        fetchMonthlyAttendance();
        if (isAdminOrHR) fetchAllAttendance();
      }
    } catch (error) {
      console.error("Failed to check in:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_out" }),
      });

      if (res.ok) {
        const data = await res.json();
        setTodayAttendance(data.attendance);
        fetchMonthlyAttendance();
        if (isAdminOrHR) fetchAllAttendance();
      }
    } catch (error) {
      console.error("Failed to check out:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const presentDays = monthlyAttendance.filter((a) => a.status === "present").length;
  const leaveDays = monthlyAttendance.filter((a) => a.status === "leave").length;
  const totalWorkingDays = new Date(currentYear, currentMonth, 0).getDate();

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Attendance</h2>
                  <span className="text-sm text-gray-500">{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <LogIn size={18} />
                          <span className="text-sm font-medium">Check In</span>
                        </div>
                        <p className="text-xl font-bold text-green-700">
                          {todayAttendance?.check_in
                            ? format(new Date(todayAttendance.check_in), "hh:mm a")
                            : "--:--"}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                          <LogOut size={18} />
                          <span className="text-sm font-medium">Check Out</span>
                        </div>
                        <p className="text-xl font-bold text-red-700">
                          {todayAttendance?.check_out
                            ? format(new Date(todayAttendance.check_out), "hh:mm a")
                            : "--:--"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {!todayAttendance?.check_in ? (
                        <button
                          onClick={handleCheckIn}
                          disabled={actionLoading}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                          {actionLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <LogIn size={20} />
                              Check In
                            </>
                          )}
                        </button>
                      ) : !todayAttendance?.check_out ? (
                        <button
                          onClick={handleCheckOut}
                          disabled={actionLoading}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                        >
                          {actionLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <LogOut size={20} />
                              Check Out
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex-1 text-center py-3 bg-gray-100 rounded-lg text-gray-600">
                          Attendance completed for today
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:block w-32 h-32 bg-primary-50 rounded-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary-600">
                        {todayAttendance?.work_hours?.toFixed(1) || "0.0"}
                      </p>
                      <p className="text-xs text-primary-500">Hours</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar size={20} className="text-gray-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Monthly Attendance</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-medium min-w-[120px] text-center">
                      {format(new Date(currentYear, currentMonth - 1), "MMMM yyyy")}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Check In</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Check Out</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Work Hours</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Extra Hours</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyAttendance.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-gray-500">
                              No attendance records for this month
                            </td>
                          </tr>
                        ) : (
                          monthlyAttendance.map((record) => (
                            <tr key={record.id} className="border-b border-gray-100">
                              <td className="py-3 px-4 text-sm">
                                {format(new Date(record.date), "MMM d, EEE")}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {record.check_in ? format(new Date(record.check_in), "hh:mm a") : "-"}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {record.check_out ? format(new Date(record.check_out), "hh:mm a") : "-"}
                              </td>
                              <td className="py-3 px-4 text-sm font-medium">
                                {record.work_hours?.toFixed(1) || "0"} hrs
                              </td>
                              <td className="py-3 px-4 text-sm">
                                <span className={record.extra_hours > 0 ? "text-green-600" : ""}>
                                  {record.extra_hours?.toFixed(1) || "0"} hrs
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    record.status === "present"
                                      ? "bg-green-100 text-green-700"
                                      : record.status === "leave"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Days Present</span>
                    <span className="text-xl font-bold text-green-600">{presentDays}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Leave Days</span>
                    <span className="text-xl font-bold text-blue-600">{leaveDays}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Working Days</span>
                    <span className="text-xl font-bold text-gray-900">{totalWorkingDays}</span>
                  </div>
                </div>
              </div>

              {isAdminOrHR && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Overview</h3>
                  <div className="space-y-3">
                    {allAttendance.length === 0 ? (
                      <p className="text-gray-500 text-sm">No attendance recorded yet</p>
                    ) : (
                      allAttendance.slice(0, 5).map((record) => (
                        <div key={record.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-medium text-primary-700">
                            {record.employee?.first_name?.[0]}
                            {record.employee?.last_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {record.employee?.first_name} {record.employee?.last_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {record.check_in ? format(new Date(record.check_in), "hh:mm a") : "-"}
                              {record.check_out ? ` - ${format(new Date(record.check_out), "hh:mm a")}` : ""}
                            </p>
                          </div>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              record.check_out ? "bg-gray-400" : "bg-green-500"
                            }`}
                          ></span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
