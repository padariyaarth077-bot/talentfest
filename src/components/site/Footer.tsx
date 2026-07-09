import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Youtube, Linkedin, Sparkles, Mail, Phone, MapPin } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function Footer() {
  const { t } = useLang();

  return (
    <footer className="mt-24 border-t border-border bg-gradient-to-b from-transparent to-accent/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <Link to="/" className="mb-4 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary">
              <Sparkles className="h-5 w-5 text-foreground" />
            </span>
            <span className="font-display text-lg font-bold">
              Talent<span className="text-gradient">Fest</span>
            </span>
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">{t("footer.desc")}</p>
          <div className="mt-4 flex gap-2">
            {[Instagram, Facebook, Youtube, Linkedin].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="grid h-9 w-9 place-items-center rounded-lg border border-border transition hover:bg-accent"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("footer.quickLinks")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/#about" className="hover:text-foreground">{t("nav.about")}</a></li>
            <li><a href="/#services" className="hover:text-foreground">{t("nav.services")}</a></li>
            <li><Link to="/register" className="hover:text-foreground">{t("nav.registration")}</Link></li>
            <li><Link to="/gallery" className="hover:text-foreground">{t("nav.gallery")}</Link></li>
            <li><Link to="/entry-pass" className="hover:text-foreground">{t("nav.entryPass")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("footer.legal")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">{t("footer.privacy")}</a></li>
            <li><a href="#" className="hover:text-foreground">{t("footer.terms")}</a></li>
            <li><a href="/#sponsor" className="hover:text-foreground">{t("nav.sponsorship")}</a></li>
            <li><a href="/#blog" className="hover:text-foreground">{t("nav.blog")}</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("footer.contact")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {t("footer.location")}</li>
            <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" /> +91 98000 00000</li>
            <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" /> hello@talentfest.in</li>
          </ul>
          <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder={t("footer.newsletter")}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="rounded-lg px-3 py-2 text-sm font-medium gradient-primary text-primary-foreground">
              {t("footer.join")}
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Talent Fest. {t("footer.rights")}</p>
          <p>{t("footer.made")}</p>
        </div>
      </div>
    </footer>
  );
}
