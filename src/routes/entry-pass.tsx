import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Sparkles, Download, ArrowRight, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateEntryPass } from "@/lib/entry-pass.functions";
import { generatePassPdf, renderPassToCanvas } from "@/lib/pdf-generator";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/entry-pass")({
  component: EntryPassPage,
});

type PassState = "idle" | "loading" | "success" | "error";

interface PassData {
  id: string;
  entryNumber: string;
  participantName: string;
  eventName: string;
  status: string;
  createdAt: string;
}

const qrValueForPass = (passData: PassData | null) =>
  passData
    ? JSON.stringify({
        id: passData.id,
        entryNumber: passData.entryNumber,
        name: passData.participantName,
      })
    : "talentfest.in/entry-pass";

const qrRenderSize = 768;

function EntryPassPage() {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [state, setState] = useState<PassState>("idle");
  const [passData, setPassData] = useState<PassData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const validate = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t("entryPass.requiredName"));
      return false;
    }
    if (trimmed.length < 2) {
      setNameError(t("entryPass.minName"));
      return false;
    }
    setNameError("");
    return true;
  }, [name, t]);

  const handleGenerate = useCallback(async () => {
    if (!validate()) return;
    setState("loading");
    setErrorMsg("");
    try {
      const result = await generateEntryPass({ data: { participantName: name.trim() } });
      if (!result.success) {
        setState("error");
        setErrorMsg(result.error);
        return;
      }
      setPassData(result.pass);
      setState("success");
    } catch (e) {
      setState("error");
      setErrorMsg(e instanceof Error ? e.message : t("entryPass.unexpected"));
    }
  }, [name, t, validate]);

  const handleDownload = useCallback(async () => {
    if (!passData || downloading) return;
    setDownloading(true);
    try {
      const qrCanvas = qrRef.current;
      if (!qrCanvas) throw new Error(t("entryPass.qrMissing"));
      const qrDataUrl = qrCanvas.toDataURL("image/png");

      const canvas = document.createElement("canvas");
      const cw = 600;
      const ch = 750;
      canvas.width = cw * 2;
      canvas.height = ch * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error(t("entryPass.canvasMissing"));
      ctx.scale(2, 2);

      await renderPassToCanvas(canvas, {
        participantName: passData.participantName,
        entryNumber: passData.entryNumber,
        eventName: passData.eventName,
        qrDataUrl,
      });

      const filename = `Talent-Fest-Entry-Pass-${passData.entryNumber}.pdf`;
      await generatePassPdf(canvas, filename);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : t("entryPass.pdfFailed"));
    } finally {
      setDownloading(false);
    }
  }, [passData, downloading, t]);

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase text-primary border border-primary/30 bg-primary/5 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            {t("entryPass.eyebrow")}
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-semibold tracking-tight">
            {t("entryPass.titlePrefix")} <span className="text-gradient">{t("entryPass.titleHighlight")}</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            {t("entryPass.subtitle")}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* FORM */}
          <div className="glass rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-display font-semibold mb-6">{t("entryPass.detailsTitle")}</h2>

            <div className="space-y-5">
              <div>
                <label htmlFor="pass-name" className="block text-sm font-medium text-foreground mb-1.5">
                  {t("entryPass.participantName")} <span className="text-primary">*</span>
                </label>
                <input
                  id="pass-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  placeholder={t("entryPass.participantPlaceholder")}
                  className={`w-full px-4 py-2.5 rounded-xl bg-background border text-sm focus:outline-none focus:ring-2 transition-all duration-300 ${
                    nameError
                      ? "border-destructive focus:ring-destructive/30"
                      : "border-border focus:ring-primary/30 focus:border-primary/50"
                  }`}
                  disabled={state === "loading"}
                  autoComplete="name"
                  aria-required="true"
                  aria-describedby={nameError ? "name-error" : undefined}
                />
                {nameError && (
                  <p id="name-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {nameError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("entryPass.eventName")}</label>
                <input
                  type="text"
                  value="Talent Fest Live 2026"
                  readOnly
                  className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-muted-foreground cursor-not-allowed"
                  tabIndex={-1}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("entryPass.entryNumber")}</label>
                <input
                  type="text"
                  value={
                    state === "success" && passData
                      ? passData.entryNumber
                      : state === "loading"
                        ? t("entryPass.generatingShort")
                        : t("entryPass.generatedAfter")
                  }
                  readOnly
                  className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-muted-foreground cursor-not-allowed"
                  tabIndex={-1}
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={state === "loading"}
                className="w-full gradient-primary text-primary-foreground border-0 h-11 shadow-soft hover:shadow-glow transition-all duration-300 text-sm tracking-wider"
              >
                {state === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("entryPass.generatingButton")}
                  </>
                ) : (
                  <>
                    {t("entryPass.generateButton")} <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              {state === "success" && passData && (
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <CheckCircle className="h-4 w-4" /> {t("entryPass.success")}
                  </div>
                  <Button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full mt-3 bg-background border border-primary/30 text-foreground hover:bg-primary/10 h-10 text-sm"
                    variant="outline"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("entryPass.preparingPdf")}
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        {t("entryPass.downloadPdf")}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {state === "error" && errorMsg && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {errorMsg}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* PREVIEW */}
          <div className="lg:sticky lg:top-28">
            <h2 className="text-xl font-display font-semibold mb-6 text-center lg:text-left">
              {t("entryPass.preview")}
            </h2>
            <div className="glass rounded-2xl p-6 sm:p-8">
              <div className="min-h-[640px] sm:min-h-[700px] lg:min-h-[740px] max-w-md mx-auto rounded-xl overflow-hidden border border-border/50">
                <div className="w-full min-h-[640px] sm:min-h-[700px] lg:min-h-[740px] bg-gradient-to-br from-[#0B0B0B] via-[#151515] to-[#0B0B0B] p-5 flex flex-col">
                  <div className="bg-[#1A1A1A] rounded-lg py-2.5 text-center mb-4">
                    <span className="font-bold text-lg tracking-wider" style={{
                      background: 'linear-gradient(135deg, #B8963A, #C8A96A, #D4B87A)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>
                      ENTRY PASS
                    </span>
                  </div>

                  <p className="text-xs text-primary font-semibold text-center mb-3">
                    Talent Fest Live 2026
                  </p>

                  <div className="flex-1 rounded-xl bg-[#151515] border border-[#2A2A2A] p-4 flex flex-col">
                    <p className="text-[10px] text-muted-foreground tracking-wider">{t("entryPass.participant").toUpperCase()}</p>
                    <p className="text-base font-semibold text-foreground mt-1">
                      {name.trim() || t("entryPass.yourName")}
                    </p>

                    <p className="text-[10px] text-muted-foreground tracking-wider mt-3">{t("entryPass.event").toUpperCase()}</p>
                    <p className="text-sm text-foreground mt-0.5">Talent Fest Live 2026</p>

                    <p className="text-[10px] text-muted-foreground tracking-wider mt-3">{t("entryPass.entryNumber").toUpperCase()}</p>
                    <p className="text-sm font-bold text-primary mt-0.5">
                      {state === "success" && passData ? passData.entryNumber : "—"}
                    </p>

                    <div className="mt-auto pt-3 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground text-center">
                        {t("entryPass.present")}
                      </p>
                      <p className="text-[10px] text-primary text-center mt-0.5">talentfest.in</p>
                    </div>

                    <div className="flex justify-center mt-5">
                      <div className="bg-white rounded-xl p-3 shadow-soft">
                        <div className="h-[160px] w-[160px] sm:h-[180px] sm:w-[180px] lg:h-[210px] lg:w-[210px]">
                          <QRCodeCanvas
                            ref={qrRef}
                            value={qrValueForPass(passData)}
                            size={qrRenderSize}
                            level="M"
                            marginSize={4}
                            bgColor="#FFFFFF"
                            fgColor="#000000"
                            className="block h-full w-full"
                            style={{ width: "100%", height: "100%", imageRendering: "pixelated" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {import.meta.env.DEV && (
          <div className="mt-8 p-4 rounded-xl bg-accent/30 border border-border text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">{t("entryPass.setupTitle")}</p>
            <p>{t("entryPass.setupText")}</p>
            <pre className="mt-2 p-3 rounded-lg bg-background overflow-x-auto text-[10px] leading-relaxed">
{`CREATE SEQUENCE IF NOT EXISTS public.public_entry_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.public_entry_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT UNIQUE NOT NULL DEFAULT ('TF-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.public_entry_number_seq')::text, 6, '0')),
  participant_name TEXT NOT NULL,
  event_name TEXT NOT NULL DEFAULT 'Talent Fest Live 2026',
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.public_entry_passes TO service_role;
GRANT USAGE ON SEQUENCE public.public_entry_number_seq TO service_role;

ALTER TABLE public.public_entry_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.public_entry_passes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS public_entry_passes_entry_number_idx
  ON public.public_entry_passes(entry_number);`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
