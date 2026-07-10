import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { CheckCircle, Download, Printer, Home, Sparkles, Loader2, AlertCircle, User, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { fetchRegistration } from "@/lib/registrations.functions";
import { renderSingleSidedPassToCanvas, generatePassPdf } from "@/lib/pdf-generator";

export const Route = createFileRoute("/thank-you")({
  component: ThankYouPage,
  validateSearch: (search: Record<string, string>) => ({ regId: search.regId || "" }),
});

function ThankYouPage() {
  const { regId } = Route.useSearch();
  const { t } = useLang();
  const [reg, setReg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const qrRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  useEffect(() => {
    if (!regId) { setLoading(false); setError("No registration ID."); return; }
    fetchRegistration({ data: { id: regId } })
      .then((data) => { setReg(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [regId]);

  const downloadPass = async (pass: any) => {
    if (downloading) return;
    setDownloading(pass.id);
    try {
      const qrCanvas = qrRefs.current[pass.id];
      if (!qrCanvas) return;
      const qrDataUrl = qrCanvas.toDataURL("image/png");
      const canvas = document.createElement("canvas");
      canvas.width = 1400;
      canvas.height = 800;
      await renderSingleSidedPassToCanvas(canvas, {
        passNumber: pass.passNumber,
        passType: pass.passType,
        participantName: reg.fullName,
        eventName: reg.eventName,
        eventCity: reg.eventCity,
        eventDate: reg.eventDate,
        startTime: reg.startTime,
        venue: reg.venue,
        activityCategory: reg.activityCategory,
        eventImageUrl: reg.eventImageUrl,
        qrDataUrl,
        status: "active",
      });
      const prefix = pass.passType === "visitor" ? "Visitor" : pass.passType === "guest_1" || pass.passType === "guest_2" ? "Guest" : "Participant";
      const filename = `TalentFest-${prefix}-${pass.passNumber}.pdf`;
      await generatePassPdf(canvas, filename);
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setDownloading(null);
    }
  };

  const downloadAll = async () => {
    if (!reg?.passes) return;
    for (const pass of reg.passes) {
      await downloadPass(pass);
    }
  };

  if (loading) return <div className="min-h-screen pt-24 pb-16 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (error || !reg) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-md mx-auto px-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-primary/50" />
          <h2 className="mt-4 text-2xl font-semibold">Pass Not Found</h2>
          <p className="mt-2 text-muted-foreground">{error || "We could not find your registration."}</p>
          <Link to="/entry-pass" className="mt-6 inline-block gradient-primary text-primary-foreground rounded-xl px-6 py-3 font-semibold">Generate New Pass</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-6 sm:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 mb-4">
            <CheckCircle className="h-3.5 w-3.5" /> Payment Successful
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-semibold tracking-tight">
            Your Pass{reg.passes?.length > 1 ? "es" : ""} Are <span className="text-gradient">Ready</span>
          </h1>
          <p className="mt-3 text-muted-foreground">Download your pass{reg.passes?.length > 1 ? "es" : ""} below.</p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8 mb-6">
          <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
            <div><span className="text-muted-foreground">Registration:</span><br /><span className="font-mono text-primary font-semibold">{reg.registrationNumber}</span></div>
            <div><span className="text-muted-foreground">Name:</span><br /><span className="font-semibold">{reg.fullName}</span></div>
            <div><span className="text-muted-foreground">Event:</span><br /><span>{reg.eventName}</span></div>
            <div><span className="text-muted-foreground">Amount Paid:</span><br /><span className="text-primary font-semibold">₹{reg.payments?.[0]?.amount || 0}</span></div>
          </div>
        </div>

        <div className="space-y-8">
          {reg.passes?.map((pass: any) => {
            const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;
            const verifyUrl = `${siteUrl}/verify-pass/${pass.id}?t=${pass.secureQrToken}`;
            const label = pass.passType === "visitor" ? "VISITOR ENTRY PASS" :
              pass.passType === "guest_1" ? "GUEST 1 PASS" :
              pass.passType === "guest_2" ? "GUEST 2 PASS" : "PARTICIPANT PASS";

            return (
              <div key={pass.id} className="glass rounded-2xl p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row rounded-xl overflow-hidden border border-primary/20 shadow-elegant bg-[#0B0B0B]">
                  <div className="lg:w-[38%] bg-[#151515] min-h-[220px] flex items-center justify-center">
                    {reg.eventImageUrl ? (
                      <img src={reg.eventImageUrl} alt={reg.eventName} className="h-full w-full object-contain" />
                    ) : (
                      <div className="text-center p-6">
                        <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary grid place-items-center">
                          <Sparkles className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <p className="text-xs text-primary mt-3 font-semibold">{reg.eventName}</p>
                        <p className="text-[10px] text-muted-foreground">{reg.eventCity}</p>
                      </div>
                    )}
                  </div>
                  <div className="lg:w-[62%] p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-xs font-bold tracking-wider text-primary">TALENT FEST</span>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 uppercase tracking-wider">Active</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs flex-1">
                      <div>
                        <p className="text-[9px] text-muted-foreground tracking-wider">NAME</p>
                        <p className="text-sm font-semibold">{pass.passType === "participant" ? reg.fullName : reg.guests?.find((g: any) => g.id === pass.guestId)?.fullName || reg.fullName}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground tracking-wider">PASS NO.</p>
                        <p className="text-sm font-bold text-primary font-mono">{pass.passNumber}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground tracking-wider">EVENT</p>
                        <p className="text-sm">{reg.eventName}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground tracking-wider">CITY / DATE</p>
                        <p className="text-sm">{reg.eventCity} | {reg.eventDate || "TBD"}</p>
                      </div>
                      {reg.activityCategory && pass.passType === "participant" && (
                        <div>
                          <p className="text-[9px] text-muted-foreground tracking-wider">CATEGORY</p>
                          <p className="text-sm">{reg.activityCategory}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
                      <div className="bg-white rounded-xl p-2 shrink-0">
                        <div className="h-[80px] w-[80px]">
                          <QRCodeCanvas
                            ref={(node) => { if (node) qrRefs.current[pass.id] = node; }}
                            value={verifyUrl}
                            size={256}
                            level="M"
                            marginSize={2}
                            className="block h-full w-full"
                            style={{ width: "100%", height: "100%" }}
                          />
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground">Present this pass and a valid identification document at the entry gate.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => downloadPass(pass)} disabled={downloading === pass.id}>
                    {downloading === pass.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                    Download {pass.passType === "participant" ? "Pass" : pass.passType === "visitor" ? "Pass" : "Pass"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {reg.passes?.length > 1 && (
            <Button variant="outline" onClick={downloadAll} disabled={!!downloading} className="px-8">
              <Download className="h-4 w-4 mr-2" /> Download All Passes
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()} className="px-8">
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Link to="/">
            <Button className="gradient-primary text-primary-foreground border-0 px-8">
              <Home className="h-4 w-4 mr-2" /> Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
