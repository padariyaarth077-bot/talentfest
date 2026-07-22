import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { submitContactMessage } from "@/lib/contact.functions";
import { businessDetails } from "@/lib/business-details";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact TelentFest" },
      {
        name: "description",
        content:
          "Get in touch with the TelentFest team for registrations, events, or partnerships.",
      },
    ],
  }),
  component: ContactPage,
});

const address = businessDetails.registeredAddress;
const phone = businessDetails.phone;
const email = businessDetails.email;
const whatsapp = businessDetails.phone;
const mapsEmbed = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
const mapsSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

const contactCards = [
  { icon: MapPin, label: "Address", value: address, href: mapsSearch },
  { icon: Phone, label: "Phone", value: phone, href: businessDetails.phoneHref },
  { icon: Mail, label: "Email", value: email, href: businessDetails.emailHref },
  { icon: MessageCircle, label: "WhatsApp", value: whatsapp, href: "https://wa.me/918401960422" },
];

function ContactPage() {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = "Full name is required";
    if (!/^\d{10}$/.test(form.phone.trim())) errs.phone = "Enter exactly 10 digits";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Invalid email address";
    if (!form.subject.trim()) errs.subject = "Subject is required";
    if (!form.message.trim()) errs.message = "Message is required";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    const trimmed = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
    };
    try {
      await submitContactMessage({ data: trimmed });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to send message. Please try again.",
      );
      setSubmitting(false);
      return;
    }
    // Open WhatsApp with prefilled message
    const whatsappNumber = "918401960422";
    const whatsappMessage = `
Hello TelentFest Team,

I am contacting you through the TelentFest website.

Name: ${trimmed.full_name}
Phone: +91 ${trimmed.phone}
Email: ${trimmed.email}
Subject: ${trimmed.subject}

Message:
${trimmed.message}

Thank you.
`.trim();
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setSubmitted(true);
    setForm({ full_name: "", phone: "", email: "", subject: "", message: "" });
    setSubmitting(false);
  };

  const handleChange = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  };

  const inputClass = (field: string) =>
    `w-full rounded-xl bg-card border ${errors[field] ? "border-destructive" : "border-border"} px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition`;

  return (
    <>
      <Section
        eyebrow="Contact Us"
        title="Contact Us"
        subtitle="Have questions about registrations, events or partnerships? Get in touch with the TelentFest team."
      >
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-5">
          {/* Contact Cards + Map */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="font-semibold text-foreground">{businessDetails.legalName}</p>
              <div className="mt-2 space-y-1 text-sm leading-relaxed text-muted-foreground">
                {businessDetails.addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
            {contactCards.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover-lift"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl gradient-primary text-foreground">
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <div className="font-medium break-words">{c.value}</div>
                </div>
              </a>
            ))}
            <div className="h-56 overflow-hidden rounded-2xl border border-border">
              <iframe
                title="TelentFest office location on Google Maps"
                src={mapsEmbed}
                className="h-full w-full"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
              <h3 className="text-xl font-bold mb-6">Send Us a Message</h3>
              {submitted ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Message Sent</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Thank you for contacting us. We will get back to you shortly.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Full Name
                      </label>
                      <input
                        value={form.full_name}
                        onChange={(e) => handleChange("full_name", e.target.value)}
                        placeholder="Your full name"
                        className={inputClass("full_name")}
                      />
                      {errors.full_name && (
                        <p className="mt-1 text-xs text-destructive">{errors.full_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Phone Number
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          +91
                        </span>
                        <input
                          value={form.phone}
                          onChange={(e) =>
                            handleChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
                          }
                          placeholder="8401960422"
                          className={`${inputClass("phone")} pl-11`}
                          type="tel"
                          maxLength={10}
                        />
                      </div>
                      {errors.phone && (
                        <p className="mt-1 text-xs text-destructive">{errors.phone}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Email Address
                    </label>
                    <input
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="your@email.com"
                      className={inputClass("email")}
                      type="email"
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Subject
                    </label>
                    <input
                      value={form.subject}
                      onChange={(e) => handleChange("subject", e.target.value)}
                      placeholder="How can we help you?"
                      className={inputClass("subject")}
                    />
                    {errors.subject && (
                      <p className="mt-1 text-xs text-destructive">{errors.subject}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Message
                    </label>
                    <textarea
                      value={form.message}
                      onChange={(e) => handleChange("message", e.target.value)}
                      placeholder="Write your message here..."
                      rows={5}
                      className={inputClass("message")}
                    />
                    {errors.message && (
                      <p className="mt-1 text-xs text-destructive">{errors.message}</p>
                    )}
                  </div>
                  {submitError && (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {submitError}
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full border-0 gradient-primary text-primary-foreground"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
