import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  Building2,
  IndianRupee,
  Loader2,
  Plus,
  Send,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { submitEmployeeAwardRegistration } from "@/lib/employee-awards.functions";

export const Route = createFileRoute("/employee-award-ceremony-2026")({
  head: () => ({ meta: [{ title: "Employee Award Ceremony 2026 Registration - Telent Fest" }] }),
  component: EmployeeAwardCeremonyPage,
});

const OWNER_FEE = 1500;
const EMPLOYEE_AWARD_FEE = 1500;
const MAX_EMPLOYEES = 20;

type UploadImage = { name: string; mime: "image/jpeg" | "image/jpg" | "image/png" | "image/webp"; base64: string; size: number };
type EmployeeInput = {
  name: string;
  designation: string;
  department: string;
  email: string;
  mobile: string;
  photo: UploadImage | null;
};
type FormState = {
  companyName: string;
  companyLogo: UploadImage | null;
  companyEmail: string;
  companyMobile: string;
  companyAddress: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber: string;
  companyWebsite: string;
  ownerName: string;
  ownerDesignation: string;
  ownerEmail: string;
  ownerMobile: string;
  ownerPhoto: UploadImage | null;
  employees: EmployeeInput[];
  declarationAccepted: boolean;
};
type ErrorMap = Partial<Record<keyof FormState | `employee-${number}-${keyof EmployeeInput}` | "submit", string>>;

const emptyEmployee = (): EmployeeInput => ({
  name: "",
  designation: "",
  department: "",
  email: "",
  mobile: "",
  photo: null,
});

const emptyForm: FormState = {
  companyName: "",
  companyLogo: null,
  companyEmail: "",
  companyMobile: "",
  companyAddress: "",
  city: "",
  state: "",
  pincode: "",
  gstNumber: "",
  companyWebsite: "",
  ownerName: "",
  ownerDesignation: "",
  ownerEmail: "",
  ownerMobile: "",
  ownerPhoto: null,
  employees: [emptyEmployee()],
  declarationAccepted: false,
};

const fieldLabels: Record<string, string> = {
  companyName: "Company name",
  companyLogo: "Company logo",
  companyEmail: "Company email",
  companyMobile: "Company mobile",
  companyAddress: "Company address",
  city: "City",
  state: "State",
  pincode: "Pincode",
  ownerName: "Owner name",
  ownerDesignation: "Owner designation",
  ownerEmail: "Owner email",
  ownerMobile: "Owner mobile",
  declarationAccepted: "Declaration",
};

function validationList(next: ErrorMap) {
  return Object.entries(next)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, message]) => {
      const employee = key.match(/^employee-(\d+)-(.+)$/);
      if (employee) return `Employee ${Number(employee[1]) + 1} ${employee[2]}: ${message}`;
      return `${fieldLabels[key] || key}: ${message}`;
    });
}

function readableSubmitError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "");
  try {
    const parsed = JSON.parse(raw) as Array<{ message?: string; path?: Array<string | number> }>;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        const path = item.path?.join(" ") || "Field";
        return `${path}: ${item.message || "Invalid value."}`;
      });
    }
  } catch {
    // Keep the original message for non-Zod errors.
  }
  return [raw || "Unable to submit this registration. Please try again."];
}

function EmployeeAwardCeremonyPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [alertErrors, setAlertErrors] = useState<string[]>([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState(() =>
    crypto.randomUUID ? crypto.randomUUID() : `employee-award-${Date.now()}-${Math.random()}`,
  );

  const totals = useMemo(() => {
    const employeeCount = form.employees.length;
    return {
      employeeCount,
      totalAmount: OWNER_FEE + employeeCount * EMPLOYEE_AWARD_FEE,
    };
  }, [form.employees.length]);

  if (pathname.endsWith("/success")) return <Outlet />;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, submit: undefined }));
  };

  const updatePhone = (key: "companyMobile" | "ownerMobile", value: string) => {
    update(key, value.replace(/\D/g, "").slice(0, 10));
  };

  const updateEmployee = <K extends keyof EmployeeInput>(index: number, key: K, value: EmployeeInput[K]) => {
    setForm((current) => ({
      ...current,
      employees: current.employees.map((employee, i) => (i === index ? { ...employee, [key]: value } : employee)),
    }));
    setErrors((current) => ({ ...current, [`employee-${index}-${key}`]: undefined, submit: undefined }));
  };

  const setEmployeeCount = (value: string) => {
    const count = Math.min(MAX_EMPLOYEES, Math.max(1, Number(value.replace(/\D/g, "")) || 1));
    setForm((current) => {
      if (count < current.employees.length) {
        const removed = current.employees.slice(count).some((employee) => Object.values(employee).some(Boolean));
        if (removed && !window.confirm("Remove employee details beyond the new count?")) return current;
      }
      return {
        ...current,
        employees:
          count > current.employees.length
            ? [...current.employees, ...Array.from({ length: count - current.employees.length }, emptyEmployee)]
            : current.employees.slice(0, count),
      };
    });
  };

  const validate = () => {
    const next: ErrorMap = {};
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const required: Array<keyof FormState> = [
      "companyName",
      "companyEmail",
      "companyMobile",
      "companyAddress",
      "city",
      "state",
      "pincode",
      "ownerName",
      "ownerDesignation",
      "ownerEmail",
      "ownerMobile",
    ];

    required.forEach((key) => {
      const value = form[key];
      if (typeof value === "string" && !value.trim()) next[key] = "This field is required.";
    });
    if (!form.companyLogo) next.companyLogo = "Company logo is required.";
    if (form.companyName.trim() && form.companyName.trim().length < 2) next.companyName = "Enter at least 2 characters.";
    if (form.companyAddress.trim() && form.companyAddress.trim().length < 5) next.companyAddress = "Enter at least 5 characters.";
    if (form.city.trim() && form.city.trim().length < 2) next.city = "Enter at least 2 characters.";
    if (form.state.trim() && form.state.trim().length < 2) next.state = "Enter at least 2 characters.";
    if (form.ownerName.trim() && form.ownerName.trim().length < 2) next.ownerName = "Enter at least 2 characters.";
    if (form.ownerDesignation.trim() && form.ownerDesignation.trim().length < 2) next.ownerDesignation = "Enter at least 2 characters.";
    if (!email.test(form.companyEmail.trim())) next.companyEmail = "Enter a valid email address.";
    if (!email.test(form.ownerEmail.trim())) next.ownerEmail = "Enter a valid email address.";
    if (form.companyMobile.length !== 10) next.companyMobile = "Enter a valid 10-digit mobile number.";
    if (form.ownerMobile.length !== 10) next.ownerMobile = "Enter a valid 10-digit mobile number.";
    if (!/^\d{6}$/.test(form.pincode)) next.pincode = "Enter a valid 6-digit pincode.";
    if (!form.declarationAccepted) next.declarationAccepted = "Please accept the declaration.";

    form.employees.forEach((employee, index) => {
      if (!employee.name.trim()) next[`employee-${index}-name`] = "Employee name is required.";
      else if (employee.name.trim().length < 2) next[`employee-${index}-name`] = "Enter at least 2 characters.";
      if (!employee.designation.trim()) next[`employee-${index}-designation`] = "Designation is required.";
      else if (employee.designation.trim().length < 2) next[`employee-${index}-designation`] = "Enter at least 2 characters.";
      if (employee.email && !email.test(employee.email.trim())) next[`employee-${index}-email`] = "Enter a valid email address.";
      if (employee.mobile && employee.mobile.length !== 10) next[`employee-${index}-mobile`] = "Enter a valid 10-digit mobile number.";
    });

    setErrors(next);
    const list = validationList(next);
    if (list.length) {
      setAlertErrors(list);
      setAlertOpen(true);
    }
    return list.length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !validate()) return;

    setSubmitting(true);
    setErrors({});
    try {
      const result = await submitEmployeeAwardRegistration({
        data: {
          idempotencyKey,
          ...form,
          companyLogo: form.companyLogo!,
          employees: form.employees.map((employee) => ({
            ...employee,
            mobile: employee.mobile.replace(/\D/g, ""),
          })),
        },
      });
      navigate({ to: "/employee-award-ceremony-2026/success", search: { company: result.companyRegistrationNumber } });
    } catch (error) {
      const list = readableSubmitError(error);
      setErrors({ submit: list[0] });
      setAlertErrors(list);
      setAlertOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 sm:py-16">
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <Award className="h-4 w-4" />
            Employee Award Ceremony 2026
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            Company Award <span className="text-gradient">Registration</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Register your company contact and award-winning employees. The total is calculated on the server before payment.
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-6">
          <FormSection icon={Building2} title="Company Details">
            <TextField label="Company Name" value={form.companyName} error={errors.companyName} onChange={(value) => update("companyName", value)} required />
            <FileField label="Company Logo" value={form.companyLogo} error={errors.companyLogo} onChange={(value) => update("companyLogo", value)} required />
            <TextField label="Company Email" value={form.companyEmail} error={errors.companyEmail} onChange={(value) => update("companyEmail", value)} type="email" required />
            <PhoneField label="Company Mobile" value={form.companyMobile} error={errors.companyMobile} onChange={(value) => updatePhone("companyMobile", value)} required />
            <TextField label="Company Address" value={form.companyAddress} error={errors.companyAddress} onChange={(value) => update("companyAddress", value)} textarea required className="md:col-span-2" />
            <TextField label="City" value={form.city} error={errors.city} onChange={(value) => update("city", value)} required />
            <TextField label="State" value={form.state} error={errors.state} onChange={(value) => update("state", value)} required />
            <TextField label="Pincode" value={form.pincode} error={errors.pincode} onChange={(value) => update("pincode", value.replace(/\D/g, "").slice(0, 6))} required />
            <TextField label="GST Number" value={form.gstNumber} error={errors.gstNumber} onChange={(value) => update("gstNumber", value.toUpperCase())} placeholder="Optional" />
            <TextField label="Company Website" value={form.companyWebsite} error={errors.companyWebsite} onChange={(value) => update("companyWebsite", value)} placeholder="Optional" />
          </FormSection>

          <FormSection icon={UserRound} title="Owner / Authorized Person">
            <TextField label="Owner Name" value={form.ownerName} error={errors.ownerName} onChange={(value) => update("ownerName", value)} required />
            <TextField label="Owner Designation" value={form.ownerDesignation} error={errors.ownerDesignation} onChange={(value) => update("ownerDesignation", value)} required />
            <TextField label="Owner Email" value={form.ownerEmail} error={errors.ownerEmail} onChange={(value) => update("ownerEmail", value)} type="email" required />
            <PhoneField label="Owner Mobile" value={form.ownerMobile} error={errors.ownerMobile} onChange={(value) => updatePhone("ownerMobile", value)} required />
            <FileField label="Owner Photo" value={form.ownerPhoto} error={errors.ownerPhoto} onChange={(value) => update("ownerPhoto", value)} />
          </FormSection>

          <FormSection icon={UserRound} title="Employees Receiving Awards">
            <div className="md:col-span-2 grid gap-4 sm:grid-cols-[220px_1fr] sm:items-end">
              <TextField label="Employee Count" value={String(form.employees.length)} error={errors.employees} onChange={setEmployeeCount} type="number" required />
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-muted-foreground">
                Owner is the company contact only. Award IDs are created only for employees. You can add up to {MAX_EMPLOYEES} employees.
              </div>
            </div>

            {form.employees.map((employee, index) => (
              <div key={index} className="md:col-span-2 rounded-2xl border border-border bg-background/70 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-semibold">Employee {index + 1}</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEmployeeCount(String(form.employees.length - 1))} disabled={form.employees.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Full Name" value={employee.name} error={errors[`employee-${index}-name`]} onChange={(value) => updateEmployee(index, "name", value)} required />
                  <TextField label="Designation" value={employee.designation} error={errors[`employee-${index}-designation`]} onChange={(value) => updateEmployee(index, "designation", value)} required />
                  <TextField label="Department" value={employee.department} error={errors[`employee-${index}-department`]} onChange={(value) => updateEmployee(index, "department", value)} />
                  <PhoneField label="Mobile" value={employee.mobile} error={errors[`employee-${index}-mobile`]} onChange={(value) => updateEmployee(index, "mobile", value.replace(/\D/g, "").slice(0, 10))} />
                  <TextField label="Email" value={employee.email} error={errors[`employee-${index}-email`]} onChange={(value) => updateEmployee(index, "email", value)} type="email" />
                  <FileField label="Employee Photo" value={employee.photo} error={errors[`employee-${index}-photo`]} onChange={(value) => updateEmployee(index, "photo", value)} />
                </div>
              </div>
            ))}

            <div className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEmployeeCount(String(form.employees.length + 1))} disabled={form.employees.length >= MAX_EMPLOYEES}>
                <Plus className="h-4 w-4" />
                Add Employee
              </Button>
            </div>
          </FormSection>

          <FormSection icon={IndianRupee} title="Review & Payment Amount">
            <PriceRow label="Owner registration fee" value={`1 x Rs. ${OWNER_FEE}`} />
            <PriceRow label="Employee award fees" value={`${totals.employeeCount} x Rs. ${EMPLOYEE_AWARD_FEE}`} />
            <PriceRow label="Employees receiving awards" value={String(totals.employeeCount)} />
            <PriceRow label="Total amount" value={`Rs. ${totals.totalAmount.toLocaleString("en-IN")}`} strong />
            <label className="md:col-span-2 flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background/70 p-4 text-sm">
              <input
                type="checkbox"
                checked={form.declarationAccepted}
                onChange={(event) => update("declarationAccepted", event.target.checked)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span>I confirm that the company, owner, employee and payment details are accurate.</span>
            </label>
            {errors.declarationAccepted && <ErrorText text={errors.declarationAccepted} className="md:col-span-2" />}
          </FormSection>

          <div className="flex justify-center">
            <Button type="submit" disabled={submitting} className="h-14 min-w-64 border-0 gradient-primary px-8 text-base font-semibold text-primary-foreground shadow-soft hover:shadow-glow">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Continue to Payment
                </>
              )}
            </Button>
          </div>
        </form>
      </section>
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Please fix the form
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alertErrors.length === 1 ? "One field needs attention before payment." : "Some fields need attention before payment."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
            <ul className="list-disc space-y-1 pl-5">
              {alertErrors.map((message, index) => (
                <li key={`${message}-${index}`}>{message}</li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormSection({ icon: Icon, title, children }: { icon: typeof Award; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-primary/20 bg-card/80 p-5 shadow-soft sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/35 bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  type = "text",
  textarea = false,
  required = false,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  textarea?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {textarea ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary"
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          type={type}
          min={type === "number" ? 0 : undefined}
          max={type === "number" ? MAX_EMPLOYEES : undefined}
          className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary"
        />
      )}
      {error && <ErrorText text={error} />}
    </div>
  );
}

function PhoneField({ label, value, onChange, error, required = false }: { label: string; value: string; onChange: (value: string) => void; error?: string; required?: boolean }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <div className="flex h-12 overflow-hidden rounded-2xl border border-border bg-background focus-within:border-primary">
        <span className="grid w-16 place-items-center border-r border-border text-sm text-muted-foreground">+91</span>
        <input id={id} value={value} onChange={(event) => onChange(event.target.value)} required={required} inputMode="numeric" placeholder="9876543210" className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none" />
      </div>
      {error && <ErrorText text={error} />}
    </div>
  );
}

function FileField({ label, value, onChange, error, required = false }: { label: string; value: UploadImage | null; onChange: (value: UploadImage | null) => void; error?: string; required?: boolean }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const readFile = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      onChange(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      onChange({
        name: file.name,
        mime: file.type as UploadImage["mime"],
        base64: String(reader.result),
        size: file.size,
      });
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <label htmlFor={id} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm hover:border-primary/50">
        <span className="truncate text-muted-foreground">{value?.name || "Upload JPG, PNG or WebP"}</span>
        <Upload className="h-4 w-4 shrink-0 text-primary" />
      </label>
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp" required={required && !value} className="sr-only" onChange={(event) => readFile(event.target.files?.[0])} />
      {value && (
        <button type="button" className="mt-2 text-xs font-semibold text-primary" onClick={() => onChange(null)}>
          Remove file
        </button>
      )}
      {error && <ErrorText text={error} />}
    </div>
  );
}

function PriceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border bg-background/70 p-4 ${strong ? "md:col-span-2" : ""}`}>
      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={`mt-1 ${strong ? "text-2xl font-bold text-primary" : "font-semibold"}`}>{value}</div>
    </div>
  );
}

function ErrorText({ text, className = "" }: { text: string; className?: string }) {
  return <p className={`mt-2 text-xs text-destructive ${className}`}>{text}</p>;
}
