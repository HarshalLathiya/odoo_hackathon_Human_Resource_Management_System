"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Download, RefreshCw, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import type { Payroll, Employee } from "@/lib/types";

export default function PayrollPage() {
  const [payrolls, setPayrolls] = useState<(Payroll & { employee?: Employee })[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<(Payroll & { employee?: Employee }) | null>(null);

  useEffect(() => {
    fetchPayroll();
  }, [currentMonth, currentYear]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?month=${currentMonth}&year=${currentYear}`);
      const data = await res.json();
      setPayrolls(data.payroll || []);
    } catch (error) {
      console.error("Failed to fetch payroll:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePayroll = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, year: currentYear }),
      });

      if (res.ok) {
        fetchPayroll();
      }
    } catch (error) {
      console.error("Failed to generate payroll:", error);
    } finally {
      setGenerating(false);
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

  const totalGross = payrolls.reduce((sum, p) => sum + (p.gross_salary || 0), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + (p.net_salary || 0), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + (p.total_deductions || 0), 0);

  return (
    <ProtectedRoute requireAdmin>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-800 ">
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium min-w-[120px] text-center text-black">
                  {format(new Date(currentYear, currentMonth - 1), "MMMM yyyy")}
                </span>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-800  ">
                  <ChevronRight size={20} />
                </button>
              </div>
              <button
                onClick={generatePayroll}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
              >
                {generating ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                Generate Payroll
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Total Gross Salary</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalGross.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Total Deductions</p>
              <p className="text-2xl font-bold text-red-600">₹{totalDeductions.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500 mb-1">Total Net Salary</p>
              <p className="text-2xl font-bold text-green-600">₹{totalNet.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : payrolls.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No payroll records for this month</p>
                <p className="text-sm text-gray-400 mt-1">Click &quot;Generate Payroll&quot; to create payslips</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Employee</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Days</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Gross</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Deductions</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Net Salary</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.map((payroll) => (
                      <tr key={payroll.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-medium text-primary-700">
                              {payroll.employee?.first_name?.[0]}
                              {payroll.employee?.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {payroll.employee?.first_name} {payroll.employee?.last_name}
                              </p>
                              <p className="text-xs text-gray-500">{payroll.employee?.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className="text-green-600">{payroll.days_present}P</span>
                          {payroll.paid_leave_days > 0 && (
                            <span className="text-blue-600 ml-1">+{payroll.paid_leave_days}L</span>
                          )}
                          {payroll.unpaid_leave_days > 0 && (
                            <span className="text-red-600 ml-1">-{payroll.unpaid_leave_days}</span>
                          )}
                          <span className="text-gray-400">/{payroll.working_days}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-gray-500">
                          ₹{payroll.gross_salary?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-red-600">
                          -₹{payroll.total_deductions?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-bold text-green-600">
                          ₹{payroll.net_salary?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              payroll.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : payroll.status === "processed"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {payroll.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedPayroll(payroll)}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {selectedPayroll && (
          <PayslipModal
            payroll={selectedPayroll}
            onClose={() => setSelectedPayroll(null)}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function PayslipModal({
  payroll,
  onClose,
}: {
  payroll: Payroll & { employee?: Employee };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payslip</h2>
            <p className="text-gray-500">
              {format(new Date(payroll.year, payroll.month - 1), "MMMM yyyy")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-lg font-medium text-primary-700">
              {payroll.employee?.first_name?.[0]}
              {payroll.employee?.last_name?.[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {payroll.employee?.first_name} {payroll.employee?.last_name}
              </p>
              <p className="text-sm text-gray-500">
                {payroll.employee?.designation} • {payroll.employee?.department}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6 text-center">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-green-600">Present</p>
            <p className="text-lg font-bold text-green-700">{payroll.days_present}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600">Paid Leave</p>
            <p className="text-lg font-bold text-blue-700">{payroll.paid_leave_days}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-red-600">Unpaid</p>
            <p className="text-lg font-bold text-red-700">{payroll.unpaid_leave_days}</p>
          </div>
          <div className="bg-gray-100 rounded-lg p-3">
            <p className="text-xs text-gray-600">Working Days</p>
            <p className="text-lg font-bold text-gray-700">{payroll.working_days}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Earnings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Basic Salary</span>
                <span>₹{payroll.basic_salary?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">HRA</span>
                <span>₹{payroll.hra?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Standard Allowance</span>
                <span>₹{payroll.standard_allowance?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Performance Bonus</span>
                <span>₹{payroll.performance_bonus?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">LTA</span>
                <span>₹{payroll.lta?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fixed Allowance</span>
                <span>₹{payroll.fixed_allowance?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span>Gross Salary</span>
                <span>₹{payroll.gross_salary?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Deductions</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">PF (Employee)</span>
                <span className="text-red-600">-₹{payroll.pf_employee?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Professional Tax</span>
                <span className="text-red-600">-₹{payroll.professional_tax?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span>Total Deductions</span>
                <span className="text-red-600">-₹{payroll.total_deductions?.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Net Salary</p>
              <p className="text-2xl font-bold text-green-700">
                ₹{payroll.net_salary?.toLocaleString()}
              </p>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p>Employer PF Contribution: ₹{payroll.pf_employer?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Close
          </button>
          <button className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
