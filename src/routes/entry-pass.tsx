import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles, ArrowRight, AlertCircle, Loader2,
  User, Phone, CreditCard, Calendar, MapPin,
  Eye, EyeOff, Users, Ticket, Clock, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import {
  fetchEvents, fetchActivityCategories, createPendingRegistration,
  createVisitorPendingRegistration, uploadParticipantPhoto
} from "@/lib/registrations.functions";

export const Route = createFileRoute("/entry-pass")({
  component: EntryPassPage,
});

type TabType = "participant" | "visitor";

interface EventOption {
  id: string; name: string; city: string; city_code: string; event_image_url?: string;
  event_date?: string; start_time?: string; venue?: string;
  participant_price: number; visitor_price: number; guest_price: number;
  participant_capacity: number; visitor_capacity?: number; guest_capacity: number;
  maximum_guests_per_participant: number;
  registration_status: string; visitor_registration_enabled?: boolean;
}

interface CategoryOption {
  id: string; name: string; slug: string; capacity?: number; registration_status: string;
}

function EventPosterImage({
  src,
  alt,
  className,
  fallbackClassName,
  compact = false,
}: {
  src?: string;
  alt: string;
  className: string;
  fallbackClassName: string;
  compact?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`${fallbackClassName} flex items-center justify-center text-center`}>
        <div>
          <Ticket className={`${compact ? "h-5 w-5" : "h-8 w-8"} mx-auto text-primary/50`} />
          {!compact && <p className="mt-2 text-xs font-semibold text-primary">{alt || "Event"}</p>}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

function EntryPassPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("participant");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, string>>({
    name: "", eventName: "Telent Fest Live 2026", passNumber: "Pending...", tab: "participant"
  });

  useEffect(() => {
    fetchEvents().then(setEvents).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background pt-8 pb-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase text-primary border border-primary/30 bg-primary/5 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            {t("entryPass.eyebrow") || "REGISTRATION"}
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-semibold tracking-tight">
            Generate Your
            <span className="text-gradient"> {tab === "participant" ? "Participant Pass" : "Visitor Entry Pass"}</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            {tab === "participant"
              ? "Register as a participant, select your event and activity, and optionally add eligible guests."
              : "Complete the visitor registration form to continue to checkout and generate your visitor pass."}
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-2xl border border-primary/30 bg-card p-1.5">
            <button
              onClick={() => setTab("participant")}
              className={`px-6 py-3 rounded-xl text-sm font-semibold tracking-wider transition-all duration-300 ${
                tab === "participant"
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="inline h-4 w-4 mr-2 -mt-0.5" />
              PARTICIPANT PASS
            </button>
            <button
              onClick={() => setTab("visitor")}
              className={`px-6 py-3 rounded-xl text-sm font-semibold tracking-wider transition-all duration-300 ${
                tab === "visitor"
                  ? "gradient-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Ticket className="inline h-4 w-4 mr-2 -mt-0.5" />
              VISITOR ENTRY PASS
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {tab === "participant" ? (
            <ParticipantForm onNavigate={navigate} onPreviewUpdate={setPreviewData} />
          ) : (
            <VisitorForm onNavigate={navigate} onPreviewUpdate={setPreviewData} />
          )}
          <LivePassPreview tab={tab} data={previewData} events={events} />
        </div>
      </div>
    </div>
  );
}

function ParticipantForm({ onNavigate, onPreviewUpdate }: { onNavigate: (opts: any) => void; onPreviewUpdate: (data: Record<string, string>) => void }) {
  const [evList, setEvList] = useState<EventOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [photoData, setPhotoData] = useState<{ base64: string; mime: string; size: number } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("+91");
  const [email, setEmail] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [guest1Enabled, setGuest1Enabled] = useState(false);
  const [guest1Name, setGuest1Name] = useState("");
  const [guest1Phone, setGuest1Phone] = useState("");
  const [guest2Enabled, setGuest2Enabled] = useState(false);
  const [guest2Name, setGuest2Name] = useState("");
  const [guest2Phone, setGuest2Phone] = useState("");
  const [showAadhaar, setShowAadhaar] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchEvents().then(setEvList).catch(() => {});
  }, []);

  useEffect(() => {
    const ev = evList.find((e) => e.id === selectedEvent);
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    onPreviewUpdate({
      name: fullName || "Your Name",
      eventName: ev?.name || "Telent Fest",
      eventCity: ev?.city || "",
      eventDate: ev?.event_date || "",
      eventId: ev?.id || "",
      eventImageUrl: ev?.event_image_url || "",
      passNumber: "Pending...",
      tab: "participant",
    });
  }, [firstName, middleName, lastName, selectedEvent, evList]);

  useEffect(() => {
    if (selectedEvent) {
      fetchActivityCategories({ data: { eventId: selectedEvent } }).then(setCategories).catch(() => setCategories([]));
      setSelectedCategory("");
    }
  }, [selectedEvent]);

  const selEvent = evList.find((e) => e.id === selectedEvent);

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    else if (/\d/.test(firstName)) e.firstName = "First name cannot contain numbers";
    if (!lastName.trim()) e.lastName = "Last name is required";
    else if (/\d/.test(lastName)) e.lastName = "Last name cannot contain numbers";
    if (!phone.match(/^\+91\d{10}$/)) e.phone = "Enter valid 10-digit mobile number after +91";
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Enter a valid email address";
    const aadhaarClean = aadhaar.replace(/\s/g, "");
    if (!aadhaarClean.match(/^\d{12}$/)) e.aadhaar = "Aadhaar must be exactly 12 digits";
    if (!aadhaarConsent) e.aadhaarConsent = "You must consent to Aadhaar usage";
    if (!selectedEvent) e.event = "Please select an event";
    if (!selectedCategory) e.category = "Please select an activity category";
    if (guest1Enabled && !guest1Name.trim()) e.guest1Name = "Guest 1 name is required";
    if (guest1Enabled && !guest1Phone.match(/^\+91\d{10}$/)) e.guest1Phone = "Enter valid 10-digit number";
    if (guest2Enabled && !guest2Name.trim()) e.guest2Name = "Guest 2 name is required";
    if (guest2Enabled && !guest2Phone.match(/^\+91\d{10}$/)) e.guest2Phone = "Enter valid 10-digit number";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [firstName, lastName, phone, email, aadhaar, aadhaarConsent, selectedEvent, selectedCategory, guest1Enabled, guest1Name, guest1Phone, guest2Enabled, guest2Name, guest2Phone]);

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await createPendingRegistration({ data: {
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        phone,
        email: email.trim().toLowerCase(),
        aadhaar: aadhaar.replace(/\s/g, ""),
        aadhaarConsent: true,
        eventId: selectedEvent,
        activityCategoryId: selectedCategory,
        guest1Name: guest1Enabled ? guest1Name.trim() : "",
        guest1Phone: guest1Enabled ? guest1Phone : "",
        guest2Name: guest2Enabled ? guest2Name.trim() : "",
        guest2Phone: guest2Enabled ? guest2Phone : "",
      }});
      if (result.success) {
        if (photoData) {
          try {
            await uploadParticipantPhoto({ data: {
              registrationId: result.registration.id,
              eventId: selectedEvent,
              base64Image: photoData.base64,
              mimeType: photoData.mime as "image/jpeg" | "image/png" | "image/webp",
              fileSizeBytes: photoData.size,
            }});
          } catch { /* photo upload optional */ }
        }
        onNavigate({ to: "/checkout", search: { regId: result.registration.id } });
      }
    } catch (err: any) {
      setErrors({ submit: err.message || "Registration failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const aadhaarDisplay = aadhaar.replace(/\s/g, "").replace(/^(\d{4})\d{4}(\d{4})$/, "XXXX XXXX $2");

  return (
    <div className="glass rounded-2xl p-6 sm:p-8">
      <h2 className="text-xl font-display font-semibold mb-6">Participant Details</h2>

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="First Name *" error={errors.firstName}>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="field-input" placeholder="First" />
          </Field>
          <Field label="Middle Name" error={errors.middleName}>
            <input value={middleName} onChange={(e) => setMiddleName(e.target.value)}
              className="field-input" placeholder="Middle (optional)" />
          </Field>
          <Field label="Last Name *" error={errors.lastName}>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="field-input" placeholder="Last" />
          </Field>
        </div>

        <Field label="Phone Number *" error={errors.phone}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium select-none">+91</span>
            <input value={phone.replace("+91", "")} onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 10);
              setPhone("+91" + v);
            }} className="field-input pl-14" placeholder="Enter your 10-digit mobile number" inputMode="numeric" type="tel" />
          </div>
        </Field>

        <Field label="Email ID *" error={errors.email}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" placeholder="you@example.com" type="email" />
        </Field>

        <Field label="Aadhaar Card Number *" error={errors.aadhaar}>
          <div className="relative">
            <input value={showAadhaar ? aadhaar : aadhaarDisplay}
              onChange={(e) => {
                const v = e.target.value.replace(/\s/g, "").replace(/\D/g, "").slice(0, 12);
                if (v.length <= 4) setAadhaar(v);
                else if (v.length <= 8) setAadhaar(v.slice(0, 4) + " " + v.slice(4));
                else setAadhaar(v.slice(0, 4) + " " + v.slice(4, 8) + " " + v.slice(8, 12));
              }}
              className="field-input pr-10" placeholder="1234 5678 9012" inputMode="numeric" readOnly={!showAadhaar} />
            <button type="button" onClick={() => setShowAadhaar(!showAadhaar)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showAadhaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <PhotoCapture
          photoData={photoData}
          onPhotoCapture={setPhotoData}
          error={errors.photo}
        />

        <label className="flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer">
          <input type="checkbox" checked={aadhaarConsent} onChange={(e) => setAadhaarConsent(e.target.checked)}
            className="mt-1 h-4 w-4 accent-primary" />
          <span className="text-xs text-muted-foreground leading-relaxed">
            I consent to the secure use of my Aadhaar number for registration verification purposes.
          </span>
        </label>
        {errors.aadhaarConsent && <p className="text-xs text-destructive">{errors.aadhaarConsent}</p>}

        <Field label="Event Selection *" error={errors.event}>
          <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="field-input">
            <option value="">Select event...</option>
            {evList.filter((e) => e.registration_status === "active").map((ev) => (
              <option key={ev.id} value={ev.id} disabled={ev.registration_status !== "active"}>
                {ev.name} — {ev.city} {ev.registration_status !== "active" ? "(Unavailable)" : ""}
              </option>
            ))}
          </select>
        </Field>

        {selectedEvent && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-1">
            <div className="flex items-center gap-2 text-primary"><Calendar className="h-4 w-4" /> {selEvent?.event_date || "Date TBD"}</div>
            <div className="flex items-center gap-2 text-primary"><MapPin className="h-4 w-4" /> {selEvent?.venue || "Venue TBD"}</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /> Rs. {selEvent?.participant_price || 0} per participant</div>
          </div>
        )}

        <Field label="Activity Category *" error={errors.category}>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="field-input" disabled={!selectedEvent}>
            <option value="">{selectedEvent ? "Select category..." : "Select an event first"}</option>
            {categories.filter((c) => c.registration_status === "active").map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </Field>

        {selEvent && Number(selEvent.maximum_guests_per_participant) > 0 && (
          <div className="border-t border-border pt-5 mt-6">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Add Guests — Optional
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Guest seats available: {selEvent.guest_capacity}</p>

            <label className="flex items-center gap-3 mt-4 p-3 rounded-xl border border-border cursor-pointer hover:border-primary/40 transition">
              <input type="checkbox" checked={guest1Enabled} onChange={(e) => {
                setGuest1Enabled(e.target.checked);
                if (!e.target.checked) { setGuest1Name(""); setGuest1Phone(""); setGuest2Enabled(false); }
              }} className="h-4 w-4 accent-primary" />
              <span className="text-sm font-medium">Add Guest 1</span>
            </label>

            {guest1Enabled && (
              <div className="ml-7 mt-3 space-y-3 p-4 rounded-xl border border-border/60 bg-background/40">
                <Field label="Guest 1 Full Name *" error={errors.guest1Name}>
                  <input value={guest1Name} onChange={(e) => setGuest1Name(e.target.value)} className="field-input" placeholder="Full name" />
                </Field>
                <Field label="Guest 1 Phone *" error={errors.guest1Phone}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91</span>
                    <input value={guest1Phone.replace("+91", "")} onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setGuest1Phone("+91" + v);
                    }} className="field-input pl-12" placeholder="9876543210" inputMode="numeric" />
                  </div>
                </Field>

                {Number(selEvent.maximum_guests_per_participant) >= 2 && selEvent.guest_capacity >= 2 && (
                  <>
                    <label className="flex items-center gap-3 mt-2 p-3 rounded-xl border border-border cursor-pointer hover:border-primary/40 transition">
                      <input type="checkbox" checked={guest2Enabled} onChange={(e) => {
                        setGuest2Enabled(e.target.checked);
                        if (!e.target.checked) { setGuest2Name(""); setGuest2Phone(""); }
                      }} className="h-4 w-4 accent-primary" />
                      <span className="text-sm font-medium">Add Guest 2</span>
                    </label>
                    {guest2Enabled && (
                      <div className="ml-7 mt-3 space-y-3">
                        <Field label="Guest 2 Full Name *" error={errors.guest2Name}>
                          <input value={guest2Name} onChange={(e) => setGuest2Name(e.target.value)} className="field-input" placeholder="Full name" />
                        </Field>
                        <Field label="Guest 2 Phone *" error={errors.guest2Phone}>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91</span>
                            <input value={guest2Phone.replace("+91", "")} onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setGuest2Phone("+91" + v);
                            }} className="field-input pl-12" placeholder="9876543210" inputMode="numeric" />
                          </div>
                        </Field>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {errors.submit && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {errors.submit}
            </p>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={submitting}
          className="w-full gradient-primary text-primary-foreground border-0 h-12 shadow-soft hover:shadow-glow transition-all duration-300 text-sm tracking-wider">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <>Continue to Checkout <ArrowRight className="ml-2 h-4 w-4" /></>}
        </Button>
      </div>
    </div>
  );
}

function VisitorForm({ onNavigate, onPreviewUpdate }: { onNavigate: (opts: any) => void; onPreviewUpdate: (data: Record<string, string>) => void }) {
  const [evList, setEvList] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+91");
  const [email, setEmail] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [aadhaarConsent, setAadhaarConsent] = useState(false);
  const [showAadhaar, setShowAadhaar] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoData, setPhotoData] = useState<{ base64: string; mime: string; size: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    setFetchError("");
    fetchEvents().then((evts) => {
      const eligible = evts.filter((e) => {
        const statusOk = e.registration_status == null || e.registration_status === "active";
        const visitorEnabled = e.visitor_registration_enabled !== false;
        const capacityOk = e.visitor_capacity == null || Number(e.visitor_capacity) > 0;
        return statusOk && visitorEnabled && capacityOk;
      });
      setEvList(eligible);
    }).catch(() => {
      setFetchError("Unable to load Visitor Entry Pass events. Please refresh and try again.");
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const selectedEvent = evList.find((e) => e.id === selectedEventId);

  useEffect(() => {
    onPreviewUpdate({
      name: fullName || "Your Name",
      eventName: selectedEvent?.name || "Select an event",
      eventCity: selectedEvent?.city || "",
      eventDate: selectedEvent?.event_date || "",
      eventId: selectedEvent?.id || "",
      eventImageUrl: selectedEvent?.event_image_url || "",
      passNumber: "Pending...",
      tab: "visitor",
    });
  }, [fullName, selectedEvent]);

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
    else if (/^\d+$/.test(fullName.trim())) e.fullName = "Name cannot be only numbers";
    else if (!/[A-Za-z\u0900-\u097F]/.test(fullName.trim())) e.fullName = "Name must contain letters";
    if (!phone.match(/^\+91\d{10}$/)) e.phone = "Enter valid 10-digit mobile number after +91";
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Enter a valid email address";
    const aadhaarClean = aadhaar.replace(/\s/g, "");
    if (!aadhaarClean.match(/^\d{12}$/)) e.aadhaar = "Aadhaar must be exactly 12 digits";
    if (!selectedEventId) e.event = "Please select an event";
    if (!aadhaarConsent) e.aadhaarConsent = "You must consent to Aadhaar usage";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [fullName, phone, email, aadhaar, aadhaarConsent, selectedEventId]);

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!selectedEvent) return;
    setSubmitting(true);
    try {
      const result = await createVisitorPendingRegistration({ data: {
        fullName: fullName.trim().replace(/\s+/g, " "),
        phone,
        email: email.trim().toLowerCase(),
        aadhaar: aadhaar.replace(/\s/g, ""),
        aadhaarConsent: true,
        eventId: selectedEvent.id,
      }});
      if (result.success) {
        if (photoData) {
          try {
            await uploadParticipantPhoto({ data: {
              registrationId: result.registration.id,
              eventId: selectedEventId,
              base64Image: photoData.base64,
              mimeType: photoData.mime as "image/jpeg" | "image/png" | "image/webp",
              fileSizeBytes: photoData.size,
            }});
          } catch { /* photo upload optional */ }
        }
        onNavigate({ to: "/checkout", search: { regId: result.registration.id } });
      }
    } catch (err: any) {
      setErrors({ submit: err.message || "Registration failed." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary/70" />
        <p className="mt-4 text-sm text-muted-foreground">Loading Visitor Entry Pass events...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive/60" />
        <h3 className="mt-4 text-lg font-semibold text-destructive">Connection Error</h3>
        <p className="mt-2 text-sm text-muted-foreground">{fetchError}</p>
      </div>
    );
  }

  if (evList.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <Ticket className="mx-auto h-12 w-12 text-primary/50" />
        <h3 className="mt-4 text-lg font-semibold">Visitor Registration Unavailable</h3>
        <p className="mt-2 text-sm text-muted-foreground">No events are currently accepting Visitor Entry Pass registrations. Please check again later.</p>
      </div>
    );
  }

  const aadhaarDisplay = aadhaar.replace(/\s/g, "").replace(/^(\d{4})\d{4}(\d{4})$/, "XXXX XXXX $2");

  return (
    <div className="glass rounded-2xl p-6 sm:p-8">
      <div className="space-y-5">
        <Field label="Full Name *" error={errors.fullName}>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="field-input" placeholder="Enter your full name" />
        </Field>

        <Field label="Phone Number *" error={errors.phone}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium select-none">+91</span>
            <input value={phone.replace("+91", "")} onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 10);
              setPhone("+91" + v);
            }} className="field-input pl-14" placeholder="Enter your 10-digit mobile number" inputMode="numeric" type="tel" />
          </div>
        </Field>

        <Field label="Email ID *" error={errors.email}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" placeholder="Enter your email address" type="email" />
        </Field>

        <Field label="Aadhaar Card Number *" error={errors.aadhaar}>
          <div className="relative">
            <input value={showAadhaar ? aadhaar : aadhaarDisplay}
              onChange={(e) => {
                const v = e.target.value.replace(/\s/g, "").replace(/\D/g, "").slice(0, 12);
                if (v.length <= 4) setAadhaar(v);
                else if (v.length <= 8) setAadhaar(v.slice(0, 4) + " " + v.slice(4));
                else setAadhaar(v.slice(0, 4) + " " + v.slice(4, 8) + " " + v.slice(8, 12));
              }} className="field-input pr-10" placeholder="Enter your 12-digit Aadhaar number" inputMode="numeric" readOnly={!showAadhaar} />
            <button type="button" onClick={() => setShowAadhaar(!showAadhaar)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showAadhaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Field label="Select Event *" error={errors.event}>
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="field-input">
            <option value="">Select an event...</option>
            {evList.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} — {ev.event_date || "TBD"} — {ev.city}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">Select the event for which you want to generate this Visitor Entry Pass.</p>
        </Field>

        {selectedEvent && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <EventPosterImage
                src={selectedEvent.event_image_url}
                alt={selectedEvent.name}
                className="h-14 w-20 rounded-lg object-cover shrink-0"
                fallbackClassName="h-14 w-20 rounded-lg bg-primary/10 shrink-0"
                compact
              />
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{selectedEvent.name}</p>
                <p className="text-xs text-muted-foreground">{selectedEvent.city}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {selectedEvent.event_date || "TBD"}</span>
              {selectedEvent.start_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {selectedEvent.start_time}</span>}
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {selectedEvent.venue || "Venue TBD"}</span>
              <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Rs. {selectedEvent.visitor_price ?? "-"}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Seats: {selectedEvent.visitor_capacity ?? "N/A"}</span>
            </div>
          </div>
        )}

        <PhotoCapture
          photoData={photoData}
          onPhotoCapture={setPhotoData}
          error={errors.photo}
        />

        <label className="flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 cursor-pointer">
          <input type="checkbox" checked={aadhaarConsent} onChange={(e) => setAadhaarConsent(e.target.checked)}
            className="mt-1 h-4 w-4 accent-primary" />
          <span className="text-xs text-muted-foreground leading-relaxed">
            I consent to the secure use of my Aadhaar number for Visitor Entry Pass registration verification purposes.
          </span>
        </label>
        {errors.aadhaarConsent && <p className="text-xs text-destructive">{errors.aadhaarConsent}</p>}

        {errors.submit && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {errors.submit}
          </div>
        )}

        <Button onClick={handleSubmit} disabled={submitting || !selectedEventId}
          className="w-full gradient-primary text-primary-foreground border-0 h-12 shadow-soft hover:shadow-glow transition-all duration-300 text-sm tracking-wider">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <>Continue to Checkout <ArrowRight className="ml-2 h-4 w-4" /></>}
        </Button>
      </div>
    </div>
  );
}

function LivePassPreview({ tab, data, events }: { tab: TabType; data: Record<string, string>; events: EventOption[] }) {
  const qrValue = "TALENTFEST.in/pass-preview";
  const selectedEventImg =
    data.eventImageUrl ||
    events.find((e) => e.id === data.eventId || e.name === data.eventName)?.event_image_url;
  return (
    <div className="lg:sticky lg:top-28">
      <h2 className="text-xl font-display font-semibold mb-6 text-center lg:text-left">Pass Preview</h2>
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="max-w-lg mx-auto rounded-xl overflow-hidden border border-primary/20 shadow-elegant bg-[#0B0B0B]">
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-[38%] bg-[#151515] min-h-[200px] sm:min-h-[300px] flex items-center justify-center overflow-hidden">
              <EventPosterImage
                src={selectedEventImg}
                alt={data.eventName || "Event"}
                className="h-full w-full object-contain"
                fallbackClassName="h-full min-h-[200px] w-full bg-[#151515] p-4"
              />
            </div>
            <div className="sm:w-[62%] p-5 flex flex-col">
              <div className="text-center mb-3">
                <span className="text-xs font-bold tracking-wider text-primary">TELENT FEST</span>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                  {tab === "participant" ? "PARTICIPANT PASS" : "VISITOR ENTRY PASS"}
                </div>
              </div>
              <div className="flex-1 space-y-2 text-xs">
                <div>
                  <p className="text-[9px] text-muted-foreground tracking-wider">NAME</p>
                  <p className="text-sm font-semibold text-foreground truncate">{data.name || "Your Name"}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground tracking-wider">EVENT</p>
                  <p className="text-sm text-foreground truncate">{data.eventName || "Telent Fest"}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground tracking-wider">PASS NUMBER</p>
                  <p className="text-sm font-bold text-primary">{data.passNumber || "Pending..."}</p>
                </div>
                {data.eventDate && (
                  <div>
                    <p className="text-[9px] text-muted-foreground tracking-wider">DATE</p>
                    <p className="text-sm text-foreground">{data.eventDate}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-center mt-3">
                <div className="bg-white rounded-xl p-2">
                  <div className="h-[90px] w-[90px] opacity-50">
                    <QRCodeCanvas value={qrValue} size={256} level="M" marginSize={2}
                      className="block h-full w-full" style={{ width: "100%", height: "100%" }} />
                  </div>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground text-center mt-2">Present this pass at the gate</p>
              <div className="text-center mt-1"><span className="text-[10px] text-primary font-semibold">Payment Pending</span></div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">Complete registration to generate your pass</p>
      </div>
    </div>
  );
}

function PhotoCapture({ photoData, onPhotoCapture, error }: {
  photoData: { base64: string; mime: string; size: number } | null;
  onPhotoCapture: (data: { base64: string; mime: string; size: number } | null) => void;
  error?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const cleanupCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setShowCamera(false);
  }, [stream]);

  useEffect(() => () => cleanupCamera(), [cleanupCamera]);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
      setStream(s);
      setShowCamera(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
    } catch { /* camera unavailable */ }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1];
    const blobSize = Math.round((dataUrl.length * 3) / 4);
    onPhotoCapture({ base64: `data:image/jpeg;base64,${base64}`, mime: "image/jpeg", size: blobSize });
    cleanupCamera();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
    if (file.size > 3145728) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onPhotoCapture({ base64: result, mime: file.type, size: file.size });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="border-t border-border pt-4 mt-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Camera className="h-4 w-4 text-primary" /> Participant Photo (optional)
      </h3>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
      {photoData ? (
        <div className="flex items-center gap-4">
          <img src={photoData.base64} alt="Preview" className="h-20 w-20 rounded-xl border border-border object-cover" />
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline" onClick={() => { onPhotoCapture(null); cleanupCamera(); }}>Remove</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Camera className="h-3.5 w-3.5 mr-1.5" /> Upload Photo
          </Button>
          <Button size="sm" variant="outline" onClick={startCamera} disabled={showCamera}>
            <Camera className="h-3.5 w-3.5 mr-1.5" /> Use Camera
          </Button>
        </div>
      )}
      {showCamera && (
        <div className="mt-3 p-3 rounded-xl border border-border bg-background">
          <video ref={videoRef} autoPlay playsInline className="w-full max-w-xs rounded-lg" />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={capturePhoto}>Capture</Button>
            <Button size="sm" variant="outline" onClick={cleanupCamera}>Cancel</Button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
      {error && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {error}</p>}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {error}</p>}
    </div>
  );
}

// field-input class is defined in styles.css
