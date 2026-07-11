import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, Award, Building2, CheckCircle2, Loader2, Send, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { submitEmployeeAwardRegistration } from "@/lib/employee-awards.functions";

export const Route = createFileRoute("/employee-award-ceremony-2026")({
  head: () => ({ meta: [{ title: "Employee Award Ceremony 2026 Registration - Telent Fest" }] }),
  component: EmployeeAwardCeremonyPage,
});

const awardCategories = [
  "Best Employee Award",
  "Best Team Leader Award",
  "Best Performer Award",
  "Innovation Award",
  "Best Attendance Award",
  "Rising Star Award",
  "Customer Service Excellence",
  "Leadership Excellence",
];

const emptyForm = {
  companyName: "",
  companyAddress: "",
  coordinatorName: "",
  contactNumber: "",
  companyEmail: "",
  employeeFullName: "",
  designation: "",
  department: "",
  gender: "",
  mobileNumber: "",
  employeeEmail: "",
  awardCategories: [] as string[],
  otherAwardCategory: "",
  workingSince: "",
  totalExperience: "",
  majorAchievements: "",
  eventParticipation: "",
  numberOfParticipants: "1",
  declarationAccepted: false,
  employeeSignatureName: "",
  authorizedCompanySignatureName: "",
  declarationDate: new Date().toISOString().slice(0, 10),
};

type FormState = typeof emptyForm;
type FormErrors = Partial<Record<keyof FormState | "submit", string>>;

function EmployeeAwardCeremonyPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedAwardText = useMemo(() => {
    const values = [...form.awardCategories];
    if (form.otherAwardCategory.trim()) values.push(form.otherAwardCategory.trim());
    return values.join(", ") || "Select at least one category";
  }, [form.awardCategories, form.otherAwardCategory]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, submit: undefined }));
  };

  const updatePhone = (key: "contactNumber" | "mobileNumber", value: string) => {
    update(key, value.replace(/\D/g, "").slice(0, 10));
  };

  const toggleAward = (category: string) => {
    const next = form.awardCategories.includes(category)
      ? form.awardCategories.filter((item) => item !== category)
      : [...form.awardCategories, category];
    update("awardCategories", next);
  };

  const validate = () => {
    const next: FormErrors = {};
    const required: Array<keyof FormState> = [
      "companyName",
      "companyAddress",
      "coordinatorName",
      "contactNumber",
      "companyEmail",
      "employeeFullName",
      "designation",
      "department",
      "gender",
      "mobileNumber",
      "employeeEmail",
      "totalExperience",
      "majorAchievements",
      "eventParticipation",
      "numberOfParticipants",
      "employeeSignatureName",
      "authorizedCompanySignatureName",
      "declarationDate",
    ];

    for (const key of required) {
      const value = form[key];
      if (typeof value === "string" && !value.trim()) next[key] = "This field is required.";
    }

    if (form.contactNumber.length !== 10) next.contactNumber = "Enter a valid 10-digit number.";
    if (form.mobileNumber.length !== 10) next.mobileNumber = "Enter a valid 10-digit number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.companyEmail.trim())) {
      next.companyEmail = "Enter a valid email address.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.employeeEmail.trim())) {
      next.employeeEmail = "Enter a valid email address.";
    }
    if (form.awardCategories.length === 0 && !form.otherAwardCategory.trim()) {
      next.awardCategories = "Select at least one award category.";
    }
    if (form.majorAchievements.trim().length < 10) {
      next.majorAchievements = "Please add meaningful achievement details.";
    }
    if (!Number.isInteger(Number(form.numberOfParticipants)) || Number(form.numberOfParticipants) < 1) {
      next.numberOfParticipants = "Enter at least 1 participant.";
    }
    if (!form.declarationAccepted) {
      next.declarationAccepted = "Please accept the declaration.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});
    try {
      const result = await submitEmployeeAwardRegistration({
        data: {
          ...form,
          gender: form.gender as "male" | "female" | "other",
          eventParticipation: form.eventParticipation as
            | "employee_only"
            | "employee_family"
            | "company_team",
          awardCategories: form.awardCategories as any,
          numberOfParticipants: Number(form.numberOfParticipants),
          declarationAccepted: form.declarationAccepted,
        },
      });
      navigate({
        to: "/employee-award-ceremony-2026/success",
        search: { application: result.applicationNumber },
      });
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Unable to submit this registration. Please try again.",
      });
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
            Employee Award <span className="text-gradient">Registration</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Complete the registration form below with accurate information.
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-6">
          <FormSection icon={Building2} title="Company Details">
            <TextField label="Company Name" value={form.companyName} error={errors.companyName} onChange={(value) => update("companyName", value)} required />
            <TextField label="Company Address" value={form.companyAddress} error={errors.companyAddress} onChange={(value) => update("companyAddress", value)} required textarea className="md:col-span-2" />
            <TextField label="HR / Coordinator Name" value={form.coordinatorName} error={errors.coordinatorName} onChange={(value) => update("coordinatorName", value)} required />
            <PhoneField label="Contact Number" value={form.contactNumber} error={errors.contactNumber} onChange={(value) => updatePhone("contactNumber", value)} required />
            <TextField label="Email ID" value={form.companyEmail} error={errors.companyEmail} onChange={(value) => update("companyEmail", value)} type="email" required />
          </FormSection>

          <FormSection icon={UserRound} title="Employee Details">
            <TextField label="Employee Full Name" value={form.employeeFullName} error={errors.employeeFullName} onChange={(value) => update("employeeFullName", value)} required />
            <TextField label="Designation" value={form.designation} error={errors.designation} onChange={(value) => update("designation", value)} required />
            <TextField label="Department" value={form.department} error={errors.department} onChange={(value) => update("department", value)} required />
            <ChoiceGroup
              label="Gender"
              value={form.gender}
              error={errors.gender}
              options={[
                ["male", "Male"],
                ["female", "Female"],
                ["other", "Other"],
              ]}
              onChange={(value) => update("gender", value)}
            />
            <PhoneField label="Mobile Number" value={form.mobileNumber} error={errors.mobileNumber} onChange={(value) => updatePhone("mobileNumber", value)} required />
            <TextField label="Email Address" value={form.employeeEmail} error={errors.employeeEmail} onChange={(value) => update("employeeEmail", value)} type="email" required />
          </FormSection>

          <FormSection icon={Award} title="Award Category">
            <div className="md:col-span-2">
              <div className="mb-3 text-sm font-semibold">Award Category</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {awardCategories.map((category) => (
                  <label
                    key={category}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm transition hover:border-primary/50"
                  >
                    <input
                      type="checkbox"
                      checked={form.awardCategories.includes(category)}
                      onChange={() => toggleAward(category)}
                      className="h-4 w-4 accent-primary"
                    />
                    {category}
                  </label>
                ))}
              </div>
              {errors.awardCategories && <ErrorText text={errors.awardCategories} />}
            </div>
            <TextField label="Other Award Category" value={form.otherAwardCategory} error={errors.otherAwardCategory} onChange={(value) => update("otherAwardCategory", value)} placeholder="Optional" />
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-muted-foreground">
              <span className="font-semibold text-primary">Selected:</span> {selectedAwardText}
            </div>
          </FormSection>

          <FormSection icon={CheckCircle2} title="Experience Details">
            <TextField label="Working Since" value={form.workingSince} error={errors.workingSince} onChange={(value) => update("workingSince", value)} type="date" />
            <TextField label="Total Experience" value={form.totalExperience} error={errors.totalExperience} onChange={(value) => update("totalExperience", value)} placeholder="Example: 5 years" required />
            <TextField label="Major Achievements" value={form.majorAchievements} error={errors.majorAchievements} onChange={(value) => update("majorAchievements", value)} required textarea className="md:col-span-2" />
          </FormSection>

          <FormSection icon={UserRound} title="Event Participation">
            <ChoiceGroup
              label="Participation Type"
              value={form.eventParticipation}
              error={errors.eventParticipation}
              className="md:col-span-2"
              options={[
                ["employee_only", "Employee Only"],
                ["employee_family", "Employee + Family"],
                ["company_team", "Company Team Participation"],
              ]}
              onChange={(value) => update("eventParticipation", value)}
            />
            <TextField label="Number of Participants" value={form.numberOfParticipants} error={errors.numberOfParticipants} onChange={(value) => update("numberOfParticipants", value.replace(/\D/g, ""))} type="number" required />
          </FormSection>

          <FormSection icon={CheckCircle2} title="Declaration">
            <div className="md:col-span-2 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm leading-7 text-muted-foreground">
              I hereby confirm that all the information provided above is true and correct. I
              agree to participate in the Employee Award Ceremony 2026 organized by TelentFest
              Training Institute.
            </div>
            <TextField label="Employee Signature Name" value={form.employeeSignatureName} error={errors.employeeSignatureName} onChange={(value) => update("employeeSignatureName", value)} required />
            <TextField label="Authorized Company Signature Name" value={form.authorizedCompanySignatureName} error={errors.authorizedCompanySignatureName} onChange={(value) => update("authorizedCompanySignatureName", value)} required />
            <TextField label="Date" value={form.declarationDate} error={errors.declarationDate} onChange={(value) => update("declarationDate", value)} type="date" required />
            <label className="md:col-span-2 flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background/60 p-4 text-sm">
              <input
                type="checkbox"
                checked={form.declarationAccepted}
                onChange={(event) => update("declarationAccepted", event.target.checked)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <span>I accept the declaration and confirm the submitted details are accurate.</span>
            </label>
            {errors.declarationAccepted && <ErrorText text={errors.declarationAccepted} className="md:col-span-2" />}
          </FormSection>

          {errors.submit && (
            <div className="flex items-start gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {errors.submit}
            </div>
          )}

          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={submitting}
              className="h-14 min-w-64 border-0 gradient-primary px-8 text-base font-semibold text-primary-foreground shadow-soft hover:shadow-glow"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Submit Registration
                </>
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Award;
  title: string;
  children: React.ReactNode;
}) {
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
          min={type === "number" ? 1 : undefined}
          className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary"
        />
      )}
      {error && <ErrorText text={error} />}
    </div>
  );
}

function PhoneField({
  label,
  value,
  onChange,
  error,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <div className="flex h-12 overflow-hidden rounded-2xl border border-border bg-background focus-within:border-primary">
        <span className="grid w-16 place-items-center border-r border-border text-sm text-muted-foreground">
          +91
        </span>
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          inputMode="numeric"
          placeholder="9876543210"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none"
        />
      </div>
      {error && <ErrorText text={error} />}
    </div>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
  error,
  className = "",
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2 text-sm font-semibold">{label} <span className="text-primary">*</span></div>
      <div className="flex flex-wrap gap-3">
        {options.map(([optionValue, optionLabel]) => (
          <label
            key={optionValue}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm transition hover:border-primary/50"
          >
            <input
              type="radio"
              name={label}
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
              className="accent-primary"
            />
            {optionLabel}
          </label>
        ))}
      </div>
      {error && <ErrorText text={error} />}
    </div>
  );
}

function ErrorText({ text, className = "" }: { text: string; className?: string }) {
  return <p className={`mt-2 text-xs text-destructive ${className}`}>{text}</p>;
}
