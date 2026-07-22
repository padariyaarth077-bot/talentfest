import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { businessDetails } from "@/lib/business-details";

export function Footer() {
  const { t } = useLang();

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    businessDetails.registeredAddress,
  )}`;

  return (
    <footer className="mt-12 border-t border-border bg-gradient-to-b from-transparent to-accent/40 sm:mt-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        {/* Brand Information */}
        <div>
          <Link to="/" className="mb-4 inline-flex" aria-label="TelentFest home">
            <img
              src="/brand/telentfest-logo-full.png"
              alt="TelentFest"
              className="footer-brand-logo"
              width={230}
              height={60}
            />
          </Link>

          <p className="max-w-xs text-sm text-muted-foreground">{t("footer.desc")}</p>

          <div className="mt-4 flex gap-2">
            <a
              href="https://www.instagram.com/telentfest_official"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border transition hover:bg-accent"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://www.facebook.com/share/1DHuefrm9Q/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border transition hover:bg-accent"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="https://youtube.com/@telentfest_official"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border transition hover:bg-accent"
            >
              <Youtube className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("footer.quickLinks")}</h4>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/about" className="transition hover:text-foreground">
                {t("nav.about")}
              </Link>
            </li>

            <li>
              <a href="/#services" className="transition hover:text-foreground">
                {t("nav.services")}
              </a>
            </li>

            <li>
              <Link to="/registration" className="transition hover:text-foreground">
                {t("nav.registration")}
              </Link>
            </li>

            <li>
              <Link to="/gallery" className="transition hover:text-foreground">
                {t("nav.gallery")}
              </Link>
            </li>

            <li>
              <Link to="/entry-pass" className="transition hover:text-foreground">
                {t("nav.entryPass")}
              </Link>
            </li>

            <li>
              <Link to="/contact" className="transition hover:text-foreground">
                Contact Us
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal Links */}
        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("footer.legal")}</h4>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/privacy-policy" className="transition hover:text-foreground">
                {t("footer.privacy")}
              </Link>
            </li>

            <li>
              <Link to="/terms-and-conditions" className="transition hover:text-foreground">
                {t("footer.terms")}
              </Link>
            </li>

            <li>
              <Link to="/refund-cancellation-policy" className="transition hover:text-foreground">
                Refund &amp; Cancellation Policy
              </Link>
            </li>

            <li>
              <Link to="/contact" className="transition hover:text-foreground">
                Contact Us
              </Link>
            </li>

            <li>
              <a href="/#sponsor" className="transition hover:text-foreground">
                {t("nav.sponsorship")}
              </a>
            </li>
          </ul>
        </div>

        {/* Contact Information */}
        <div>
          <h4 className="mb-3 text-sm font-semibold">{t("footer.contact")}</h4>

          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="font-semibold text-foreground">{businessDetails.legalName}</li>
            <li>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 transition hover:text-foreground"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />

                <span className="leading-relaxed">
                  {businessDetails.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </a>
            </li>

            <li>
              <a
                href={businessDetails.phoneHref}
                className="flex items-center gap-2 transition hover:text-foreground"
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span>{businessDetails.phone}</span>
              </a>
            </li>

            <li>
              <a
                href={businessDetails.emailHref}
                className="flex items-center gap-2 break-all transition hover:text-foreground"
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span>{businessDetails.email}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {businessDetails.legalName}. {t("footer.rights")}
          </p>

          <p>
            Designed &amp; Developed by{" "}
            <a
              href="https://ecliptixsolutions.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground transition-colors hover:text-primary hover:underline"
            >
              Ecliptix Solutions
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
