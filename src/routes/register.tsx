import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  Award,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  FileCheck2,
  Globe,
  Home,
  Instagram,
  Mail,
  Phone,
  RotateCcw,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { getSupabaseConfigError, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Employee Award Ceremony 2026 Registration - Talent Fest" },
      {
        name: "description",
        content: "Register for Employee Award Ceremony 2026 with TalentFest Training Institute.",
      },
    ],
  }),
  component: RegisterPage,
});

type FormState = {
  companyName: string;
  companyAddress: string;
  coordinatorName: string;
  companyContactNumber: string;
  companyEmail: string;
  employeeFullName: string;
  designation: string;
  department: string;
  gender: string;
  employeeMobileNumber: string;
  employeeEmail: string;
  awardCategory: string;
  otherAwardCategory: string;
  workingSince: string;
  totalExperience: string;
  majorAchievements: string;
  participationType: string;
  numberOfParticipants: string;
  registrationFees: string;
  paymentMethod: string;
  transactionReference: string;
  declarationAccepted: boolean;
  registrationDate: string;
};

type FormField = keyof FormState | "employeeSignature" | "companyAuthorizedSignature";
type FormErrors = Partial<Record<FormField, string>>;

type SubmittedRegistration = {
  referenceNumber?: string;
  employeeName: string;
  companyName: string;
  awardCategory: string;
  participationType: string;
  registrationDate: string;
};

const eventName = "Employee Award Ceremony 2026";
const maxAchievementLength = 1500;
const maxSignatureSize = 5 * 1024 * 1024;
const allowedSignatureTypes = ["image/png", "image/jpeg", "application/pdf"];
const allowedSignatureExtensions = ["png", "jpg", "jpeg", "pdf"];

const awardCategories = [
  "Best Employee Award",
  "Best Team Leader Award",
  "Best Performer Award",
  "Innovation Award",
  "Best Attendance Award",
  "Rising Star Award",
  "Customer Service Excellence",
  "Leadership Excellence",
  "Other",
];

const participationOptions = ["Employee Only", "Employee + Family", "Company Team Participation"];

const paymentMethods = ["Cash", "Online Payment", "Cheque"];
const genderOptions = ["Male", "Female", "Other"];

const optionLabelKeys: Record<string, string> = {
  "Best Employee Award": "register.options.bestEmployee",
  "Best Team Leader Award": "register.options.bestTeamLeader",
  "Best Performer Award": "register.options.bestPerformer",
  "Innovation Award": "register.options.innovation",
  "Best Attendance Award": "register.options.bestAttendance",
  "Rising Star Award": "register.options.risingStar",
  "Customer Service Excellence": "register.options.customerService",
  "Leadership Excellence": "register.options.leadership",
  Other: "register.options.other",
  "Employee Only": "register.options.employeeOnly",
  "Employee + Family": "register.options.employeeFamily",
  "Company Team Participation": "register.options.companyTeam",
  Cash: "register.options.cash",
  "Online Payment": "register.options.online",
  Cheque: "register.options.cheque",
  Male: "register.options.male",
  Female: "register.options.female",
};

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialForm(): FormState {
  return {
    companyName: "",
    companyAddress: "",
    coordinatorName: "",
    companyContactNumber: "",
    companyEmail: "",
    employeeFullName: "",
    designation: "",
    department: "",
    gender: "",
    employeeMobileNumber: "",
    employeeEmail: "",
    awardCategory: "",
    otherAwardCategory: "",
    workingSince: "",
    totalExperience: "",
    majorAchievements: "",
    participationType: "",
    numberOfParticipants: "",
    registrationFees: "",
    paymentMethod: "",
    transactionReference: "",
    declarationAccepted: false,
    registrationDate: todayValue(),
  };
}

function normalizeIndianMobile(value: string) {
  return value.replace(/\D/g, "").replace(/^91(?=[6-9]\d{9}$)/, "");
}

function isIndianMobile(value: string) {
  return /^[6-9]\d{9}$/.test(normalizeIndianMobile(value));
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidSignatureFile(file: File | null, t: (key: string) => string) {
  if (!file) return t("register.messages.signatureRequired");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const hasValidType =
    allowedSignatureTypes.includes(file.type) || allowedSignatureExtensions.includes(extension);
  if (!hasValidType) return t("register.messages.signatureType");
  if (file.size > maxSignatureSize) return t("register.messages.signatureSize");
  return "";
}

function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState<SubmittedRegistration | null>(null);
  const [employeeSignature, setEmployeeSignature] = useState<File | null>(null);
  const [companyAuthorizedSignature, setCompanyAuthorizedSignature] = useState<File | null>(null);

  const resolvedAwardCategory = useMemo(() => {
    if (form.awardCategory === "Other") return form.otherAwardCategory.trim();
    return form.awardCategory;
  }, [form.awardCategory, form.otherAwardCategory]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateTextField(field: keyof FormState) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      if (field === "majorAchievements" && value.length > maxAchievementLength) return;
      updateField(field, value as never);
    };
  }

  function handleAwardChange(value: string) {
    setForm((current) => ({
      ...current,
      awardCategory: value,
      otherAwardCategory: value === "Other" ? current.otherAwardCategory : "",
    }));
    setErrors((current) => ({
      ...current,
      awardCategory: undefined,
      otherAwardCategory: undefined,
    }));
  }

  function handleParticipationChange(value: string) {
    setForm((current) => ({
      ...current,
      participationType: value,
      numberOfParticipants: value === "Employee Only" ? "1" : current.numberOfParticipants,
    }));
    setErrors((current) => ({
      ...current,
      participationType: undefined,
      numberOfParticipants: undefined,
    }));
  }

  function handlePaymentMethodChange(value: string) {
    setForm((current) => ({
      ...current,
      paymentMethod: value,
      transactionReference: value === "Cash" ? "" : current.transactionReference,
    }));
    setErrors((current) => ({
      ...current,
      paymentMethod: undefined,
      transactionReference: undefined,
    }));
  }

  function handleFileChange(field: "employeeSignature" | "companyAuthorizedSignature") {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (field === "employeeSignature") setEmployeeSignature(file);
      if (field === "companyAuthorizedSignature") setCompanyAuthorizedSignature(file);
      setErrors((current) => ({ ...current, [field]: undefined }));
    };
  }

  function validateForm() {
    const nextErrors: FormErrors = {};

    const requiredFields: Array<[keyof FormState, string]> = [
      ["companyName", t("register.messages.companyNameRequired")],
      ["companyAddress", t("register.messages.companyAddressRequired")],
      ["coordinatorName", t("register.messages.coordinatorRequired")],
      ["companyContactNumber", t("register.messages.contactRequired")],
      ["companyEmail", t("register.messages.emailRequired")],
      ["employeeFullName", t("register.messages.employeeNameRequired")],
      ["designation", t("register.messages.designationRequired")],
      ["department", t("register.messages.departmentRequired")],
      ["gender", t("register.messages.genderRequired")],
      ["employeeMobileNumber", t("register.messages.employeeMobileRequired")],
      ["employeeEmail", t("register.messages.employeeEmailRequired")],
      ["awardCategory", t("register.messages.awardRequired")],
      ["workingSince", t("register.messages.workingSinceRequired")],
      ["totalExperience", t("register.messages.experienceRequired")],
      ["majorAchievements", t("register.messages.achievementsRequired")],
      ["participationType", t("register.messages.participationRequired")],
      ["numberOfParticipants", t("register.messages.participantsRequired")],
      ["registrationFees", t("register.messages.feesRequired")],
      ["paymentMethod", t("register.messages.paymentRequired")],
      ["registrationDate", t("register.messages.dateRequired")],
    ];

    requiredFields.forEach(([field, message]) => {
      const value = form[field];
      if (typeof value === "string" && !value.trim()) nextErrors[field] = message;
    });

    if (form.companyContactNumber && !isIndianMobile(form.companyContactNumber)) {
      nextErrors.companyContactNumber = t("register.messages.validMobile");
    }

    if (form.employeeMobileNumber && !isIndianMobile(form.employeeMobileNumber)) {
      nextErrors.employeeMobileNumber = t("register.messages.validMobile");
    }

    if (form.companyEmail && !isEmail(form.companyEmail)) {
      nextErrors.companyEmail = t("register.messages.validEmail");
    }

    if (form.employeeEmail && !isEmail(form.employeeEmail)) {
      nextErrors.employeeEmail = t("register.messages.validEmail");
    }

    if (form.awardCategory === "Other" && !form.otherAwardCategory.trim()) {
      nextErrors.otherAwardCategory = t("register.messages.specifyAward");
    }

    const participants = Number(form.numberOfParticipants);
    if (form.numberOfParticipants && (!Number.isInteger(participants) || participants < 1)) {
      nextErrors.numberOfParticipants = t("register.messages.minParticipants");
    }
    if (form.participationType === "Employee Only" && participants !== 1) {
      nextErrors.numberOfParticipants = t("register.messages.employeeOnlyParticipants");
    }

    const fees = Number(form.registrationFees);
    if (form.registrationFees && (!Number.isFinite(fees) || fees <= 0)) {
      nextErrors.registrationFees = t("register.messages.feesPositive");
    }

    if (!form.declarationAccepted) {
      nextErrors.declarationAccepted = t("register.messages.declarationRequired");
    }

    const employeeSignatureError = isValidSignatureFile(employeeSignature, t);
    if (employeeSignatureError) nextErrors.employeeSignature = employeeSignatureError;

    const companySignatureError = isValidSignatureFile(companyAuthorizedSignature, t);
    if (companySignatureError) nextErrors.companyAuthorizedSignature = companySignatureError;

    return nextErrors;
  }

  function focusFirstInvalid(nextErrors: FormErrors) {
    const firstField = Object.keys(nextErrors)[0];
    if (!firstField) return;
    requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(`[name="${firstField}"]`);
      field?.focus();
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  async function uploadSignature(userId: string, file: File, prefix: string) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const path = `${userId}/signatures/${prefix}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("pass-photos").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) throw error;
    return path;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    const configError = getSupabaseConfigError();
    if (configError) {
      setSubmitError(configError);
      toast.error(configError);
      return;
    }

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      focusFirstInvalid(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (userError || !userId) {
        setSubmitError(t("register.messages.signIn"));
        toast.error(t("register.messages.signIn"));
        return;
      }

      const employeeSignaturePath = await uploadSignature(
        userId,
        employeeSignature as File,
        "employee",
      );
      const companySignaturePath = await uploadSignature(
        userId,
        companyAuthorizedSignature as File,
        "company",
      );
      const finalAwardCategory = resolvedAwardCategory || form.awardCategory;

      const { data, error } = await supabase
        .from("entry_passes")
        .insert({
          user_id: userId,
          participant_name: form.employeeFullName.trim(),
          photo_url: null,
          competition: eventName,
          category: finalAwardCategory,
          sub_category: form.designation.trim(),
          company_name: form.companyName.trim(),
          company_address: form.companyAddress.trim(),
          coordinator_name: form.coordinatorName.trim(),
          company_contact_number: normalizeIndianMobile(form.companyContactNumber),
          company_email: form.companyEmail.trim(),
          employee_full_name: form.employeeFullName.trim(),
          designation: form.designation.trim(),
          department: form.department.trim(),
          gender: form.gender,
          employee_mobile_number: normalizeIndianMobile(form.employeeMobileNumber),
          employee_email: form.employeeEmail.trim(),
          award_category: finalAwardCategory,
          other_award_category:
            form.awardCategory === "Other" ? form.otherAwardCategory.trim() : null,
          working_since: form.workingSince,
          total_experience: form.totalExperience.trim(),
          major_achievements: form.majorAchievements.trim(),
          participation_type: form.participationType,
          number_of_participants: Number(form.numberOfParticipants),
          registration_fees: Number(form.registrationFees),
          payment_method: form.paymentMethod,
          transaction_reference:
            form.paymentMethod === "Cash" ? null : form.transactionReference.trim() || null,
          employee_signature_url: employeeSignaturePath,
          company_authorized_signature_url: companySignaturePath,
          declaration_accepted: form.declarationAccepted,
          registration_date: form.registrationDate,
        })
        .select("entry_number")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? t("register.messages.failed"));
      }

      const summary = {
        referenceNumber: data.entry_number,
        employeeName: form.employeeFullName.trim(),
        companyName: form.companyName.trim(),
        awardCategory: finalAwardCategory,
        participationType: form.participationType,
        registrationDate: form.registrationDate,
      };
      setSubmitted(summary);
      toast.success(t("register.messages.success"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("register.messages.failed");
      setSubmitError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    const confirmed = window.confirm(t("register.messages.resetConfirm"));
    if (!confirmed) return;
    setForm(createInitialForm());
    setEmployeeSignature(null);
    setCompanyAuthorizedSignature(null);
    setErrors({});
    setSubmitError("");
  }

  function submitAnother() {
    setForm(createInitialForm());
    setEmployeeSignature(null);
    setCompanyAuthorizedSignature(null);
    setErrors({});
    setSubmitError("");
    setSubmitted(null);
  }

  function downloadSummary() {
    if (!submitted) return;
    const lines = [
      eventName,
      "",
      `${t("register.summary.reference")}: ${submitted.referenceNumber ?? t("register.messages.unavailable")}`,
      `${t("register.summary.employeeName")}: ${submitted.employeeName}`,
      `${t("register.summary.companyName")}: ${submitted.companyName}`,
      `${t("register.summary.selectedAward")}: ${submitted.awardCategory}`,
      `${t("register.summary.participationType")}: ${submitted.participationType}`,
      `${t("register.summary.date")}: ${submitted.registrationDate}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `employee-award-registration-${submitted.referenceNumber ?? "summary"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (submitted) {
    return (
      <Section
        eyebrow={t("register.eventName")}
        title={t("register.submittedTitle")}
        subtitle={t("register.submittedSubtitle")}
      >
        <div className="mx-auto max-w-2xl rounded-3xl border border-primary/35 bg-card p-6 shadow-soft sm:p-8">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full gradient-primary text-primary-foreground">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <dl className="grid gap-3 rounded-2xl border border-border bg-background/50 p-5 text-sm sm:grid-cols-2">
            {submitted.referenceNumber && (
              <SummaryItem label={t("register.summary.reference")} value={submitted.referenceNumber} />
            )}
            <SummaryItem label={t("register.summary.employeeName")} value={submitted.employeeName} />
            <SummaryItem label={t("register.summary.companyName")} value={submitted.companyName} />
            <SummaryItem label={t("register.summary.selectedAward")} value={submitted.awardCategory} />
            <SummaryItem label={t("register.summary.participationType")} value={submitted.participationType} />
          </dl>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Button type="button" variant="outline" onClick={downloadSummary}>
              <Download className="h-4 w-4" />
              {t("register.downloadSummary")}
            </Button>
            <Button
              type="button"
              className="gradient-primary text-primary-foreground border-0"
              onClick={submitAnother}
            >
              {t("register.submitAnother")}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/" })}>
              <Home className="h-4 w-4" />
              {t("register.returnHome")}
            </Button>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section
      eyebrow={t("register.eventName")}
      title={t("register.title")}
      subtitle={t("register.subtitle")}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {submitError && (
          <div className="rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submitError}
          </div>
        )}

        <form onSubmit={submit} noValidate className="space-y-6">
          <FormSection icon={Building2} title={t("register.sections.company")}>
            <Field label={t("register.fields.companyName")} name="companyName" error={errors.companyName} required>
              <input
                id="companyName"
                name="companyName"
                value={form.companyName}
                onChange={updateTextField("companyName")}
                placeholder={t("register.placeholders.companyName")}
                className="input"
                aria-describedby={errors.companyName ? "companyName-error" : undefined}
              />
            </Field>
            <Field
              label={t("register.fields.coordinatorName")}
              name="coordinatorName"
              error={errors.coordinatorName}
              required
            >
              <input
                id="coordinatorName"
                name="coordinatorName"
                value={form.coordinatorName}
                onChange={updateTextField("coordinatorName")}
                placeholder={t("register.placeholders.coordinatorName")}
                className="input"
                aria-describedby={errors.coordinatorName ? "coordinatorName-error" : undefined}
              />
            </Field>
            <Field
              label={t("register.fields.companyContactNumber")}
              name="companyContactNumber"
              error={errors.companyContactNumber}
              required
            >
              <input
                id="companyContactNumber"
                name="companyContactNumber"
                type="tel"
                value={form.companyContactNumber}
                onChange={updateTextField("companyContactNumber")}
                placeholder={t("register.placeholders.contactNumber")}
                className="input"
                aria-describedby={
                  errors.companyContactNumber ? "companyContactNumber-error" : undefined
                }
              />
            </Field>
            <Field label={t("register.fields.companyEmail")} name="companyEmail" error={errors.companyEmail} required>
              <input
                id="companyEmail"
                name="companyEmail"
                type="email"
                value={form.companyEmail}
                onChange={updateTextField("companyEmail")}
                placeholder={t("register.placeholders.companyEmail")}
                className="input"
                aria-describedby={errors.companyEmail ? "companyEmail-error" : undefined}
              />
            </Field>
            <Field
              label={t("register.fields.companyAddress")}
              name="companyAddress"
              error={errors.companyAddress}
              required
              className="sm:col-span-2"
            >
              <textarea
                id="companyAddress"
                name="companyAddress"
                value={form.companyAddress}
                onChange={updateTextField("companyAddress")}
                placeholder={t("register.placeholders.companyAddress")}
                rows={4}
                className="input min-h-28 resize-y"
                aria-describedby={errors.companyAddress ? "companyAddress-error" : undefined}
              />
            </Field>
          </FormSection>

          <FormSection icon={UserRound} title={t("register.sections.employee")}>
            <Field
              label={t("register.fields.employeeFullName")}
              name="employeeFullName"
              error={errors.employeeFullName}
              required
            >
              <input
                id="employeeFullName"
                name="employeeFullName"
                value={form.employeeFullName}
                onChange={updateTextField("employeeFullName")}
                placeholder={t("register.placeholders.employeeName")}
                className="input"
                aria-describedby={errors.employeeFullName ? "employeeFullName-error" : undefined}
              />
            </Field>
            <Field label={t("register.fields.designation")} name="designation" error={errors.designation} required>
              <input
                id="designation"
                name="designation"
                value={form.designation}
                onChange={updateTextField("designation")}
                placeholder={t("register.placeholders.designation")}
                className="input"
                aria-describedby={errors.designation ? "designation-error" : undefined}
              />
            </Field>
            <Field label={t("register.fields.department")} name="department" error={errors.department} required>
              <input
                id="department"
                name="department"
                value={form.department}
                onChange={updateTextField("department")}
                placeholder={t("register.placeholders.department")}
                className="input"
                aria-describedby={errors.department ? "department-error" : undefined}
              />
            </Field>
            <Field
              label={t("register.fields.mobileNumber")}
              name="employeeMobileNumber"
              error={errors.employeeMobileNumber}
              required
            >
              <input
                id="employeeMobileNumber"
                name="employeeMobileNumber"
                type="tel"
                value={form.employeeMobileNumber}
                onChange={updateTextField("employeeMobileNumber")}
                placeholder={t("register.placeholders.mobile")}
                className="input"
                aria-describedby={
                  errors.employeeMobileNumber ? "employeeMobileNumber-error" : undefined
                }
              />
            </Field>
            <Field label={t("register.fields.emailAddress")} name="employeeEmail" error={errors.employeeEmail} required>
              <input
                id="employeeEmail"
                name="employeeEmail"
                type="email"
                value={form.employeeEmail}
                onChange={updateTextField("employeeEmail")}
                placeholder={t("register.placeholders.employeeEmail")}
                className="input"
                aria-describedby={errors.employeeEmail ? "employeeEmail-error" : undefined}
              />
            </Field>
            <RadioGroup
              label={t("register.fields.gender")}
              name="gender"
              value={form.gender}
              options={genderOptions}
              getOptionLabel={(value) => t(optionLabelKeys[value] ?? value)}
              onChange={(value) => updateField("gender", value)}
              error={errors.gender}
              required
            />
          </FormSection>

          <FormSection
            icon={Award}
            title={t("register.sections.award")}
            description={t("register.sections.awardDesc")}
          >
            <fieldset className="sm:col-span-2">
              <legend className="sr-only">{t("register.sections.award")}</legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {awardCategories.map((category) => (
                  <label
                    key={category}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm transition focus-within:ring-2 focus-within:ring-ring ${
                      form.awardCategory === category
                        ? "border-primary bg-primary/15 text-foreground shadow-soft"
                        : "border-border bg-background/50 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="awardCategory"
                      value={category}
                      checked={form.awardCategory === category}
                      onChange={() => handleAwardChange(category)}
                      className="h-4 w-4 accent-primary"
                      aria-describedby={errors.awardCategory ? "awardCategory-error" : undefined}
                    />
                    <span>{t(optionLabelKeys[category] ?? category)}</span>
                  </label>
                ))}
              </div>
              <ErrorMessage name="awardCategory" error={errors.awardCategory} />
            </fieldset>
            {form.awardCategory === "Other" && (
              <Field
                label={t("register.fields.otherAwardCategory")}
                name="otherAwardCategory"
                error={errors.otherAwardCategory}
                required
                className="sm:col-span-2"
              >
                <input
                  id="otherAwardCategory"
                  name="otherAwardCategory"
                  value={form.otherAwardCategory}
                  onChange={updateTextField("otherAwardCategory")}
                  placeholder={t("register.placeholders.awardCategory")}
                  className="input"
                  aria-describedby={
                    errors.otherAwardCategory ? "otherAwardCategory-error" : undefined
                  }
                />
              </Field>
            )}
          </FormSection>

          <FormSection icon={BriefcaseBusiness} title={t("register.sections.experience")}>
            <Field label={t("register.fields.workingSince")} name="workingSince" error={errors.workingSince} required>
              <input
                id="workingSince"
                name="workingSince"
                type="date"
                value={form.workingSince}
                onChange={updateTextField("workingSince")}
                className="input"
                aria-describedby={errors.workingSince ? "workingSince-error" : undefined}
              />
            </Field>
            <Field
              label={t("register.fields.totalExperience")}
              name="totalExperience"
              error={errors.totalExperience}
              required
            >
              <input
                id="totalExperience"
                name="totalExperience"
                value={form.totalExperience}
                onChange={updateTextField("totalExperience")}
                placeholder={t("register.placeholders.experience")}
                className="input"
                aria-describedby={errors.totalExperience ? "totalExperience-error" : undefined}
              />
            </Field>
            <Field
              label={t("register.fields.majorAchievements")}
              name="majorAchievements"
              error={errors.majorAchievements}
              required
              className="sm:col-span-2"
            >
              <textarea
                id="majorAchievements"
                name="majorAchievements"
                value={form.majorAchievements}
                onChange={updateTextField("majorAchievements")}
                placeholder={t("register.placeholders.achievements")}
                rows={6}
                maxLength={maxAchievementLength}
                className="input min-h-36 resize-y"
                aria-describedby={`majorAchievements-counter${errors.majorAchievements ? " majorAchievements-error" : ""}`}
              />
              <div
                id="majorAchievements-counter"
                className="mt-1.5 text-right text-xs text-muted-foreground"
              >
                {form.majorAchievements.length}/{maxAchievementLength}
              </div>
            </Field>
          </FormSection>

          <FormSection icon={Users} title={t("register.sections.participation")}>
            <RadioGroup
              label={t("register.fields.participationType")}
              name="participationType"
              value={form.participationType}
              options={participationOptions}
              getOptionLabel={(value) => t(optionLabelKeys[value] ?? value)}
              onChange={handleParticipationChange}
              error={errors.participationType}
              required
              className="sm:col-span-2"
              cardLayout
            />
            <Field
              label={t("register.fields.numberOfParticipants")}
              name="numberOfParticipants"
              error={errors.numberOfParticipants}
              required
            >
              <input
                id="numberOfParticipants"
                name="numberOfParticipants"
                type="number"
                min={1}
                max={form.participationType === "Employee Only" ? 1 : undefined}
                readOnly={form.participationType === "Employee Only"}
                value={form.numberOfParticipants}
                onChange={updateTextField("numberOfParticipants")}
                placeholder={t("register.placeholders.participants")}
                className="input"
                aria-describedby={
                  errors.numberOfParticipants ? "numberOfParticipants-error" : undefined
                }
              />
            </Field>
          </FormSection>

          <FormSection icon={CreditCard} title={t("register.sections.payment")}>
            <Field
              label={t("register.fields.registrationFees")}
              name="registrationFees"
              error={errors.registrationFees}
              required
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-primary">
                  â‚¹
                </span>
                <input
                  id="registrationFees"
                  name="registrationFees"
                  type="number"
                  min={1}
                  value={form.registrationFees}
                  onChange={updateTextField("registrationFees")}
                  placeholder={t("register.placeholders.fees")}
                  className="input pl-8"
                  aria-describedby={errors.registrationFees ? "registrationFees-error" : undefined}
                />
              </div>
            </Field>
            <RadioGroup
              label={t("register.fields.paymentMethod")}
              name="paymentMethod"
              value={form.paymentMethod}
              options={paymentMethods}
              getOptionLabel={(value) => t(optionLabelKeys[value] ?? value)}
              onChange={handlePaymentMethodChange}
              error={errors.paymentMethod}
              required
            />
            {form.paymentMethod !== "Cash" && form.paymentMethod && (
              <Field
                label={
                  form.paymentMethod === "Cheque"
                    ? t("register.fields.chequeNumber")
                    : t("register.fields.transactionReference")
                }
                name="transactionReference"
                error={errors.transactionReference}
                className="sm:col-span-2"
              >
                <input
                  id="transactionReference"
                  name="transactionReference"
                  value={form.transactionReference}
                  onChange={updateTextField("transactionReference")}
                  placeholder={
                    form.paymentMethod === "Cheque"
                      ? t("register.placeholders.cheque")
                      : t("register.placeholders.transaction")
                  }
                  className="input"
                  aria-describedby={
                    errors.transactionReference ? "transactionReference-error" : undefined
                  }
                />
              </Field>
            )}
          </FormSection>

          <FormSection icon={FileCheck2} title={t("register.sections.declaration")}>
            <div className="sm:col-span-2 rounded-2xl border border-primary/25 bg-primary/10 p-5 text-sm leading-relaxed text-foreground/90">
              “{t("register.declaration")}”
            </div>
            <fieldset className="sm:col-span-2">
              <legend className="sr-only">{t("register.fields.declarationAgreement")}</legend>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background/50 p-4 text-sm focus-within:ring-2 focus-within:ring-ring">
                <input
                  id="declarationAccepted"
                  name="declarationAccepted"
                  type="checkbox"
                  checked={form.declarationAccepted}
                  onChange={(event) => updateField("declarationAccepted", event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                  aria-describedby={
                    errors.declarationAccepted ? "declarationAccepted-error" : undefined
                  }
                />
                <span>{t("register.declarationAccept")}</span>
              </label>
              <ErrorMessage name="declarationAccepted" error={errors.declarationAccepted} />
            </fieldset>
            <FileField
              label={t("register.fields.employeeSignature")}
              name="employeeSignature"
              file={employeeSignature}
              onChange={handleFileChange("employeeSignature")}
              error={errors.employeeSignature}
              required
            />
            <FileField
              label={t("register.fields.companySignature")}
              name="companyAuthorizedSignature"
              file={companyAuthorizedSignature}
              onChange={handleFileChange("companyAuthorizedSignature")}
              error={errors.companyAuthorizedSignature}
              required
            />
            <Field label={t("register.fields.date")} name="registrationDate" error={errors.registrationDate} required>
              <input
                id="registrationDate"
                name="registrationDate"
                type="date"
                value={form.registrationDate}
                onChange={updateTextField("registrationDate")}
                className="input"
                aria-describedby={errors.registrationDate ? "registrationDate-error" : undefined}
              />
            </Field>
          </FormSection>

          <div className="flex flex-col-reverse gap-3 rounded-3xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={loading}
              className="min-h-11"
            >
              <RotateCcw className="h-4 w-4" />
              {t("register.reset")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-h-11 gradient-primary text-primary-foreground border-0"
            >
              {loading ? t("register.submitting") : t("register.submit")}
            </Button>
          </div>
        </form>

        <NeedHelpPanel />
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--background);
          padding: 0.75rem 0.875rem;
          color: var(--foreground);
          font-size: 0.875rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .input::placeholder {
          color: var(--muted-foreground);
        }
        .input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--ring);
        }
        .input[readonly] {
          cursor: not-allowed;
          opacity: 0.78;
        }
      `}</style>
    </Section>
  );
}

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex items-start gap-3 border-b border-border pb-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl gradient-primary text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  error,
  required,
  children,
  className = "",
}: {
  label: string;
  name: FormField;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      {children}
      <ErrorMessage name={name} error={error} />
    </div>
  );
}

function RadioGroup({
  label,
  name,
  value,
  options,
  onChange,
  error,
  required,
  className = "",
  cardLayout = false,
  getOptionLabel = (option) => option,
}: {
  label: string;
  name: keyof FormState;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
  cardLayout?: boolean;
  getOptionLabel?: (option: string) => string;
}) {
  return (
    <fieldset className={className}>
      <legend className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </legend>
      <div className={cardLayout ? "grid gap-3 sm:grid-cols-3" : "flex flex-wrap gap-3"}>
        {options.map((option) => (
          <label
            key={option}
            className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-sm transition focus-within:ring-2 focus-within:ring-ring ${
              value === option
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-background/50 text-muted-foreground hover:border-primary/60 hover:text-foreground"
            } ${cardLayout ? "justify-start" : ""}`}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-4 w-4 accent-primary"
              aria-describedby={error ? `${name}-error` : undefined}
            />
            <span>{getOptionLabel(option)}</span>
          </label>
        ))}
      </div>
      <ErrorMessage name={name} error={error} />
    </fieldset>
  );
}

function FileField({
  label,
  name,
  file,
  onChange,
  error,
  required,
}: {
  label: string;
  name: "employeeSignature" | "companyAuthorizedSignature";
  file: File | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
}) {
  const { t } = useLang();

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </label>
      <label
        htmlFor={name}
        className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-sm text-muted-foreground transition hover:border-primary focus-within:ring-2 focus-within:ring-ring"
      >
        <Upload className="h-4 w-4 text-primary" />
        <span className="min-w-0 flex-1 truncate">
          {file ? file.name : t("register.placeholders.upload")}
        </span>
      </label>
      <input
        id={name}
        name={name}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
        onChange={onChange}
        className="sr-only"
        aria-describedby={error ? `${name}-error` : undefined}
      />
      <p className="mt-1.5 text-xs text-muted-foreground">{t("register.maxFile")}</p>
      <ErrorMessage name={name} error={error} />
    </div>
  );
}

function ErrorMessage({ name, error }: { name: FormField; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${name}-error`} className="mt-1.5 text-xs font-medium text-destructive">
      {error}
    </p>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function NeedHelpPanel() {
  const { t } = useLang();

  return (
    <aside className="rounded-3xl border border-primary/25 bg-card p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-primary text-primary-foreground">
          <Phone className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{t("register.help.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("register.help.desc")}
          </p>
        </div>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <a href="tel:+918401960422" className="help-link">
          <Phone className="h-4 w-4" />
          8401960422
        </a>
        <a href="https://www.telentfest.in" target="_blank" rel="noreferrer" className="help-link">
          <Globe className="h-4 w-4" />
          www.telentfest.in
        </a>
        <a
          href="https://www.instagram.com/telentfest_official"
          target="_blank"
          rel="noreferrer"
          className="help-link"
        >
          <Instagram className="h-4 w-4" />
          @telentfest_official
        </a>
        <a href="mailto:telentfestseminar@gmail.com" className="help-link">
          <Mail className="h-4 w-4" />
          telentfestseminar@gmail.com
        </a>
      </div>
      <style>{`
        .help-link {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 0.5rem;
          border-radius: 0.875rem;
          border: 1px solid var(--border);
          background: color-mix(in oklab, var(--background) 78%, transparent);
          padding: 0.75rem;
          color: var(--foreground);
          transition: border-color 0.2s ease, color 0.2s ease;
          overflow-wrap: anywhere;
        }
        .help-link:hover {
          border-color: var(--primary);
          color: var(--primary);
        }
      `}</style>
    </aside>
  );
}

