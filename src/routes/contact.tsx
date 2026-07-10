import { createFileRoute } from "@tanstack/react-router";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact - Telent Fest" },
      { name: "description", content: "Get in touch with the Telent Fest team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useLang();

  return (
    <Section eyebrow={t("contact.eyebrow")} title={t("contact.title")} subtitle={t("contact.subtitle")}>
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {[
            { icon: MapPin, label: t("contact.office"), value: t("footer.location"), href: "https://www.openstreetmap.org/#map=12/19.04/72.85" },
            { icon: Phone, label: t("contact.phone"), value: "+91 98000 00000", href: "tel:+919800000000" },
            { icon: Mail, label: t("contact.email"), value: "hello@TELENTFEST.in", href: "mailto:hello@TELENTFEST.in" },
            { icon: Clock, label: t("contact.hours"), value: t("contact.hoursValue"), href: "#" },
          ].map((c) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover-lift"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl gradient-primary text-foreground">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="font-medium">{c.value}</div>
              </div>
            </a>
          ))}
          <div className="h-56 overflow-hidden rounded-2xl border border-border">
            <iframe
              title={t("contact.mapTitle")}
              src="https://www.openstreetmap.org/export/embed.html?bbox=72.82%2C19.02%2C72.87%2C19.06&layer=mapnik"
              className="h-full w-full"
              loading="lazy"
            />
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4 rounded-3xl border border-border bg-card p-8 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-2">
            <input placeholder={t("contact.namePlaceholder")} className="input" />
            <input placeholder={t("contact.emailPlaceholder")} type="email" className="input" />
          </div>
          <input placeholder={t("contact.subjectPlaceholder")} className="input" />
          <textarea placeholder={t("contact.messagePlaceholder")} rows={5} className="input" />
          <Button className="w-full border-0 gradient-primary text-primary-foreground">{t("contact.send")}</Button>
        </form>
      </div>
      <style>{`.input{width:100%;padding:0.625rem 0.875rem;border-radius:0.75rem;background:var(--background);border:1px solid var(--border);font-size:0.875rem}.input:focus{outline:none;box-shadow:0 0 0 2px var(--ring)}`}</style>
    </Section>
  );
}
