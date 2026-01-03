"use client";

import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffect, useState } from "react";
import { ArrowLeft, Edit2, Save, X, FileText, User, Lock, Wallet } from "lucide-react";
import type { Employee, SalaryStructure } from "@/lib/types";

const tabs = [
  { id: "resume", name: "Resume", icon: FileText },
  { id: "private", name: "Private Info", icon: User },
  { id: "salary", name: "Salary Info", icon: Wallet, adminOnly: true },
  { id: "security", name: "Security", icon: Lock },
];

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [salary, setSalary] = useState<SalaryStructure | null>(null);
  const [activeTab, setActiveTab] = useState("resume");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Employee>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdminOrHR = user?.role === "admin" || user?.role === "hr";
  const isOwnProfile = user?.id === params.id;
  const canEdit = isAdminOrHR || isOwnProfile;

  const filteredTabs = tabs.filter((tab) => !tab.adminOnly || isAdminOrHR);

  useEffect(() => {
    fetchEmployee();
  }, [params.id]);

  useEffect(() => {
    if (activeTab === "salary" && isAdminOrHR) {
      fetchSalary();
    }
  }, [activeTab, params.id]);

  const fetchEmployee = async () => {
    try {
      const res = await fetch(`/api/employees/${params.id}`);
      const data = await res.json();
      setEmployee(data.employee);
      setEditData(data.employee);
    } catch (error) {
      console.error("Failed to fetch employee:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalary = async () => {
    try {
      const res = await fetch(`/api/salary/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setSalary(data.salary);
      }
    } catch (error) {
      console.error("Failed to fetch salary:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (res.ok) {
        const data = await res.json();
        setEmployee(data.employee);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to update employee:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!employee) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <p className="text-gray-500">Employee not found</p>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {employee.first_name} {employee.last_name}
              </h1>
              <p className="text-gray-500">
                {employee.designation || "No designation"} • {employee.department || "No department"}
              </p>
            </div>
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                <Edit2 size={18} />
                Edit
              </button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData(employee);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <X size={18} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-1 p-2">
                {filteredTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeTab === tab.id
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === "resume" && (
                <ResumeTab employee={employee} />
              )}
              {activeTab === "private" && (
                <PrivateInfoTab
                  employee={employee}
                  editData={editData}
                  setEditData={setEditData}
                  isEditing={isEditing}
                  isAdminOrHR={isAdminOrHR}
                />
              )}
              {activeTab === "salary" && isAdminOrHR && (
                <SalaryTab
                  employeeId={employee.id}
                  salary={salary}
                  onUpdate={fetchSalary}
                />
              )}
              {activeTab === "security" && (
                <SecurityTab employee={employee} isOwnProfile={isOwnProfile} />
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function ResumeTab({ employee }: { employee: Employee }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
          {employee.profile_picture ? (
            <img
              src={employee.profile_picture}
              alt=""
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <span className="text-2xl font-medium text-primary-700">
              {employee.first_name[0]}
              {employee.last_name[0]}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {employee.first_name} {employee.last_name}
          </h2>
          <p className="text-gray-500">{employee.designation || "No designation"}</p>
          <p className="text-sm text-gray-400">{employee.department || "No department"}</p>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Login ID: <span className="font-mono">{employee.login_id}</span></span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              employee.role === "admin"
                ? "bg-purple-100 text-purple-700"
                : employee.role === "hr"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700"
            }`}>
              {employee.role.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard title="Contact Information">
          <InfoRow label="Email" value={employee.email} />
          <InfoRow label="Phone" value={employee.phone} />
        </InfoCard>
        <InfoCard title="Employment Details">
          <InfoRow label="Joining Date" value={employee.joining_date} />
          <InfoRow label="Employee ID" value={employee.login_id} />
        </InfoCard>
      </div>

      {employee.resume_url && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Resume</h3>
          <a
            href={employee.resume_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            View Resume
          </a>
        </div>
      )}
    </div>
  );
}

function PrivateInfoTab({
  employee,
  editData,
  setEditData,
  isEditing,
  isAdminOrHR,
}: {
  employee: Employee;
  editData: Partial<Employee>;
  setEditData: (data: Partial<Employee>) => void;
  isEditing: boolean;
  isAdminOrHR: boolean;
}) {
  const handleChange = (field: keyof Employee, value: string) => {
    setEditData({ ...editData, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Personal Details</h3>
          <EditableField
            label="Date of Birth"
            value={editData.date_of_birth || ""}
            onChange={(v) => handleChange("date_of_birth", v)}
            isEditing={isEditing && isAdminOrHR}
            type="date"
          />
          <EditableField
            label="Gender"
            value={editData.gender || ""}
            onChange={(v) => handleChange("gender", v)}
            isEditing={isEditing && isAdminOrHR}
            type="select"
            options={["Male", "Female", "Other"]}
          />
          <EditableField
            label="Marital Status"
            value={editData.marital_status || ""}
            onChange={(v) => handleChange("marital_status", v)}
            isEditing={isEditing && isAdminOrHR}
            type="select"
            options={["Single", "Married", "Divorced", "Widowed"]}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Contact</h3>
          <EditableField
            label="Phone"
            value={editData.phone || ""}
            onChange={(v) => handleChange("phone", v)}
            isEditing={isEditing}
          />
          <EditableField
            label="Emergency Contact Name"
            value={editData.emergency_contact_name || ""}
            onChange={(v) => handleChange("emergency_contact_name", v)}
            isEditing={isEditing}
          />
          <EditableField
            label="Emergency Contact Phone"
            value={editData.emergency_contact_phone || ""}
            onChange={(v) => handleChange("emergency_contact_phone", v)}
            isEditing={isEditing}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField
            label="Address"
            value={editData.address || ""}
            onChange={(v) => handleChange("address", v)}
            isEditing={isEditing}
          />
          <EditableField
            label="City"
            value={editData.city || ""}
            onChange={(v) => handleChange("city", v)}
            isEditing={isEditing}
          />
          <EditableField
            label="State"
            value={editData.state || ""}
            onChange={(v) => handleChange("state", v)}
            isEditing={isEditing}
          />
          <EditableField
            label="Country"
            value={editData.country || ""}
            onChange={(v) => handleChange("country", v)}
            isEditing={isEditing}
          />
          <EditableField
            label="Postal Code"
            value={editData.postal_code || ""}
            onChange={(v) => handleChange("postal_code", v)}
            isEditing={isEditing}
          />
        </div>
      </div>

      {isAdminOrHR && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Bank Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableField
              label="Bank Name"
              value={editData.bank_name || ""}
              onChange={(v) => handleChange("bank_name", v)}
              isEditing={isEditing}
            />
            <EditableField
              label="Account Number"
              value={editData.bank_account_number || ""}
              onChange={(v) => handleChange("bank_account_number", v)}
              isEditing={isEditing}
            />
            <EditableField
              label="IFSC Code"
              value={editData.ifsc_code || ""}
              onChange={(v) => handleChange("ifsc_code", v)}
              isEditing={isEditing}
            />
          </div>
        </div>
      )}

      {isAdminOrHR && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Government IDs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableField
              label="PAN Number"
              value={editData.pan_number || ""}
              onChange={(v) => handleChange("pan_number", v)}
              isEditing={isEditing}
            />
            <EditableField
              label="Aadhaar Number"
              value={editData.aadhaar_number || ""}
              onChange={(v) => handleChange("aadhaar_number", v)}
              isEditing={isEditing}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SalaryTab({
  employeeId,
  salary,
  onUpdate,
}: {
  employeeId: string;
  salary: SalaryStructure | null;
  onUpdate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    wage: salary?.wage || 0,
    basic_salary_percentage: salary?.basic_salary_percentage || 50,
    hra_percentage: salary?.hra_percentage || 50,
    standard_allowance: salary?.standard_allowance || 0,
    performance_bonus: salary?.performance_bonus || 0,
    lta: salary?.lta || 0,
    fixed_allowance: salary?.fixed_allowance || 0,
    pf_employee_percentage: salary?.pf_employee_percentage || 12,
    pf_employer_percentage: salary?.pf_employer_percentage || 12,
    professional_tax: salary?.professional_tax || 200,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (salary) {
      setFormData({
        wage: salary.wage,
        basic_salary_percentage: salary.basic_salary_percentage,
        hra_percentage: salary.hra_percentage,
        standard_allowance: salary.standard_allowance,
        performance_bonus: salary.performance_bonus,
        lta: salary.lta,
        fixed_allowance: salary.fixed_allowance,
        pf_employee_percentage: salary.pf_employee_percentage,
        pf_employer_percentage: salary.pf_employer_percentage,
        professional_tax: salary.professional_tax,
      });
    }
  }, [salary]);

  const basicSalary = (formData.wage * formData.basic_salary_percentage) / 100;
  const hra = (basicSalary * formData.hra_percentage) / 100;
  const pfEmployee = (basicSalary * formData.pf_employee_percentage) / 100;
  const pfEmployer = (basicSalary * formData.pf_employer_percentage) / 100;
  const grossSalary = basicSalary + hra + formData.standard_allowance + formData.performance_bonus + formData.lta + formData.fixed_allowance;
  const totalDeductions = pfEmployee + formData.professional_tax;
  const netSalary = grossSalary - totalDeductions;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/salary/${employeeId}`, {
        method: salary ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsEditing(false);
        onUpdate();
      }
    } catch (error) {
      console.error("Failed to save salary:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Salary Structure</h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            {salary ? "Edit Structure" : "Set Up Salary"}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Wage (CTC)
            </label>
            {isEditing ? (
              <input
                type="number"
                value={formData.wage}
                onChange={(e) => setFormData({ ...formData, wage: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            ) : (
              <p className="text-gray-900 font-medium">₹{formData.wage.toLocaleString()}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Basic (% of Wage)
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.basic_salary_percentage}
                  onChange={(e) => setFormData({ ...formData, basic_salary_percentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              ) : (
                <p className="text-gray-900">{formData.basic_salary_percentage}%</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HRA (% of Basic)
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.hra_percentage}
                  onChange={(e) => setFormData({ ...formData, hra_percentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              ) : (
                <p className="text-gray-900">{formData.hra_percentage}%</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Standard Allowance
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.standard_allowance}
                  onChange={(e) => setFormData({ ...formData, standard_allowance: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              ) : (
                <p className="text-gray-900">₹{formData.standard_allowance.toLocaleString()}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Performance Bonus
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.performance_bonus}
                  onChange={(e) => setFormData({ ...formData, performance_bonus: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              ) : (
                <p className="text-gray-900">₹{formData.performance_bonus.toLocaleString()}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LTA</label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.lta}
                  onChange={(e) => setFormData({ ...formData, lta: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              ) : (
                <p className="text-gray-900">₹{formData.lta.toLocaleString()}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fixed Allowance
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.fixed_allowance}
                  onChange={(e) => setFormData({ ...formData, fixed_allowance: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              ) : (
                <p className="text-gray-900">₹{formData.fixed_allowance.toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Deductions</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PF Employee (%)
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.pf_employee_percentage}
                  onChange={(e) => setFormData({ ...formData, pf_employee_percentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              ) : (
                <p className="text-gray-900">{formData.pf_employee_percentage}%</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PF Employer (%)
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.pf_employer_percentage}
                  onChange={(e) => setFormData({ ...formData, pf_employer_percentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              ) : (
                <p className="text-gray-900">{formData.pf_employer_percentage}%</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Professional Tax
            </label>
            {isEditing ? (
              <input
                type="number"
                value={formData.professional_tax}
                onChange={(e) => setFormData({ ...formData, professional_tax: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            ) : (
              <p className="text-gray-900">₹{formData.professional_tax.toLocaleString()}</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3">Calculated Values</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Basic Salary</span>
                <span className="font-medium">₹{basicSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">HRA</span>
                <span className="font-medium">₹{hra.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gross Salary</span>
                <span className="font-medium">₹{grossSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>PF Deduction</span>
                <span className="font-medium">-₹{pfEmployee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Professional Tax</span>
                <span className="font-medium">-₹{formData.professional_tax.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Net Salary</span>
                <span className="text-green-600">₹{netSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs">
                <span>Employer PF Contribution</span>
                <span>₹{pfEmployer.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ employee, isOwnProfile }: { employee: Employee; isOwnProfile: boolean }) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (passwords.new.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Password changed successfully" });
        setPasswords({ current: "", new: "", confirm: "" });
        setShowChangePassword(false);
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to change password" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Security</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">Login ID</p>
              <p className="text-gray-500 font-mono">{employee.login_id}</p>
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Password</h3>
          {message && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}
          {!showChangePassword ? (
            <button
              onClick={() => setShowChangePassword(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Change Password
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {loading ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900">{value || "-"}</span>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  isEditing,
  type = "text",
  options = [],
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  type?: "text" | "date" | "select";
  options?: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {isEditing ? (
        type === "select" ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
        )
      ) : (
        <p className="text-gray-900 py-2">{value || "-"}</p>
      )}
    </div>
  );
}
