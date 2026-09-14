import { Download, ExternalLink, FileText, Maximize2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n";

type Brochure = {
  id: string;
  title?: string;
  titleKey?: string;
  fileName: string;
  href: string;
};

const brochures: Brochure[] = [
  {
    id: "grandFinale",
    titleKey: "sponsorship.brochures.grandFinale",
    fileName: "telentfest-grand-finale-brochure.pdf",
    href: "/documents/telentfest-grand-finale-brochure.pdf",
  },
  {
    id: "employeeAward",
    titleKey: "sponsorship.brochures.employeeAward",
    fileName: "employee-award-ceremony-brochure.pdf",
    href: "/documents/employee-award-ceremony-brochure.pdf",
  },
];

export function SponsorshipTabs({ documents = [] }: { documents?: Array<{ id: string; name: string; file_url: string }> }) {
  const { t } = useLang();
  const contentBrochures: Brochure[] = documents.map((document) => ({ id: document.id, title: document.name, fileName: `${document.name}.pdf`, href: document.file_url }));
  const visibleBrochures = contentBrochures.length ? contentBrochures : brochures;
  const [activeBrochureId, setActiveBrochureId] = useState("grandFinale");
  useEffect(() => { setActiveBrochureId(visibleBrochures[0].id); }, [visibleBrochures[0]?.id]);
  const activeBrochure = useMemo(
    () => visibleBrochures.find((brochure) => brochure.id === activeBrochureId) ?? visibleBrochures[0],
    [activeBrochureId, visibleBrochures],
  );
  const title = (brochure: Brochure) => brochure.title ?? t(brochure.titleKey!);
  const viewerSrc = `${activeBrochure.href}#toolbar=1&navpanes=0&view=FitH`;

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5 lg:max-w-[1080px] xl:max-w-[1120px]">
      <div
        className="flex flex-col gap-3 rounded-[20px] border border-primary/25 bg-card/55 p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between"
        aria-label={t("sponsorship.selectLabel")}
      >
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          {visibleBrochures.map((brochure) => {
            const isActive = activeBrochure.id === brochure.id;

            return (
              <button
                key={brochure.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveBrochureId(brochure.id)}
                className={cn(
                  "inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none",
                  isActive
                    ? "border-transparent gradient-accent text-primary-foreground shadow-glow"
                    : "border-border bg-background/70 text-muted-foreground hover:border-primary/60 hover:text-foreground",
                )}
              >
                <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                {title(brochure)}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button asChild variant="outline" size="sm" className="rounded-2xl border-primary/40 bg-background/60">
            <a
              href={activeBrochure.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${t("sponsorship.viewBrochure")} - ${title(activeBrochure)}`}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {t("sponsorship.viewBrochure")}
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-2xl border-primary/40 bg-background/60">
            <a
              href={viewerSrc}
              target="_blank"
              rel="noreferrer"
              aria-label={`${t("sponsorship.openFullScreen")} - ${title(activeBrochure)}`}
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
              {t("sponsorship.openFullScreen")}
            </a>
          </Button>
          <Button asChild size="sm" className="rounded-2xl border-0 gradient-primary text-primary-foreground">
            <a
              href={activeBrochure.href}
              download={activeBrochure.fileName}
              aria-label={`${t("sponsorship.downloadPdf")} - ${title(activeBrochure)}`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {t("sponsorship.downloadPdf")}
            </a>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-primary/35 bg-[linear-gradient(180deg,oklch(0.13_0.02_85),oklch(0.055_0_0))] p-2 shadow-[0_0_34px_oklch(0.75_0.15_80/0.16)] sm:p-3">
        <object
          key={activeBrochure.href}
          data={viewerSrc}
          type="application/pdf"
          aria-label={`${t("sponsorship.pdfViewerLabel")} - ${title(activeBrochure)}`}
          className="h-[70vh] min-h-[520px] w-full rounded-xl bg-background md:h-[80vh] lg:h-[68vh] xl:h-[70vh]"
        >
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-xl border border-primary/25 bg-background/80 p-6 text-center">
            <FileText className="h-10 w-10 text-primary" aria-hidden="true" />
            <p className="max-w-md text-base text-foreground">{t("sponsorship.pdfFallback")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline" className="rounded-2xl border-primary/40">
                <a href={activeBrochure.href} target="_blank" rel="noreferrer">
                  {t("sponsorship.openBrochure")}
                </a>
              </Button>
              <Button asChild className="rounded-2xl border-0 gradient-primary text-primary-foreground">
                <a href={activeBrochure.href} download={activeBrochure.fileName}>
                  {t("sponsorship.downloadPdf")}
                </a>
              </Button>
            </div>
          </div>
        </object>
      </div>
    </div>
  );
}
