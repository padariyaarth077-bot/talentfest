import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Globe, LayoutDashboard } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

const menu = [
  { to: "/", labelKey: "nav.home" },
  { to: "/#services", labelKey: "nav.services" },
  { to: "/gallery", labelKey: "nav.gallery" },
  { to: "/#team", labelKey: "nav.team" },
  { to: "/registration", labelKey: "nav.entryPass" },
  { to: "/#projects", labelKey: "nav.projects" },
  { to: "/#blog", labelKey: "nav.blog" },
  { to: "/about", labelKey: "nav.about" },
  { to: "/contact", labelKey: "nav.contact" },
];

export function Header() {
  const { lang, setLang, t } = useLang();
  const router = useRouter();
  const currentPath = router.state.location.pathname;
  const currentHash = router.state.location.hash;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSignedIn(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (to: string) => {
    if (to.startsWith("/#")) {
      const hash = "#" + to.slice(2);
      return currentPath === "/" && currentHash === hash;
    }
    if (to === "/") {
      return currentPath === "/" && (!currentHash || currentHash === "#" || currentHash === "#home");
    }
    return currentPath === to;
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all ${
        scrolled ? "glass shadow-soft" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="header-brand" aria-label="TelentFest home">
          <img
            src="/brand/telentfest-logo-full.png"
            alt="TelentFest"
            className="header-brand-logo"
            width={201}
            height={52}
          />
        </Link>

        <nav className="hidden xl:flex items-center gap-1 text-sm">
          {menu.map((m) => (
            <a
              key={m.labelKey}
              href={m.to}
              className={`px-3 py-2 rounded-lg transition-colors ${
                isActive(m.to)
                  ? "text-primary bg-primary/10"
                  : "text-foreground/80 hover:text-foreground hover:bg-accent"
              }`}
            >
              {t(m.labelKey)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-accent transition"
            aria-label={t("a11y.toggleLanguage")}
          >
            <Globe className="h-3.5 w-3.5" />
            {lang === "en" ? "HI" : "EN"}
          </button>
          {signedIn ? (
            <Link to="/dashboard" className="hidden md:inline-flex">
              <Button size="sm" className="gradient-primary text-primary-foreground border-0 shadow-soft hover:opacity-95">
                <LayoutDashboard className="h-4 w-4" /> {t("common.dashboard")}
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden md:inline-flex">
                <Button variant="ghost" size="sm">{t("cta.login")}</Button>
              </Link>
            </>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            className="xl:hidden h-10 w-10 grid place-items-center rounded-lg border border-border"
            aria-label={open ? t("a11y.closeMenu") : t("a11y.openMenu")}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="xl:hidden glass border-t border-border">
          <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-2 gap-1">
            <button
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="col-span-2 mb-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:bg-accent"
              aria-label={t("a11y.toggleLanguage")}
            >
              <Globe className="h-3.5 w-3.5" />
              {lang === "en" ? "HI" : "EN"}
            </button>
            {menu.map((m) => (
              <a
                key={m.labelKey}
                href={m.to}
                onClick={() => setOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm hover:bg-accent ${
                  isActive(m.to) ? "text-primary bg-primary/10" : ""
                }`}
              >
                {t(m.labelKey)}
              </a>
            ))}
            <Link to="/login" onClick={() => setOpen(false)} className="col-span-2">
              <Button variant="outline" className="w-full mt-2">{t("cta.login")}</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
