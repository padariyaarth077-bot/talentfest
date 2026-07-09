import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import JsBarcode from "jsbarcode";
import { Sparkles, ShieldCheck, MapPin, Clock, Calendar, Ticket } from "lucide-react";

export type PassData = {
  id: string;
  entry_number: string;
  participant_name: string;
  photo_url?: string | null;
  competition: string;
  category: string;
  sub_category?: string | null;
  venue?: string | null;
  hall?: string | null;
  stage?: string | null;
  entry_gate?: string | null;
  event_date?: string | null;
  reporting_time?: string | null;
  performance_time?: string | null;
  status: string;
  verification_token: string;
};

const statusStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-500 border-red-500/30",
  checked_in: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  completed: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  expired: "bg-zinc-800/40 text-zinc-500 border-zinc-500/30",
};

export function PassCard({ pass, verifyOrigin }: { pass: PassData; verifyOrigin?: string }) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const origin = verifyOrigin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const verifyUrl = `${origin}/verify-pass/${pass.id}?t=${pass.verification_token}`;

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, pass.entry_number, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height: 40,
        background: "transparent",
        lineColor: "#000",
      });
    }
  }, [pass.entry_number]);

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-elegant border border-primary/20 bg-card max-w-md mx-auto print:shadow-none print:border-black">
      {/* Header */}
      <div className="gradient-hero px-6 py-5 flex justify-between items-center border-b border-primary/30">
        <div className="flex items-center gap-2 text-foreground">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-display font-bold tracking-tight">Talent Fest</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <ShieldCheck className="h-4 w-4" /> VERIFIED
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        <div className="flex gap-4">
          <div className="h-20 w-20 rounded-2xl bg-accent overflow-hidden shrink-0 border border-border">
            {pass.photo_url ? (
              <img src={pass.photo_url} alt={pass.participant_name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-2xl font-bold text-primary">
                {pass.participant_name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Participant</div>
            <div className="font-semibold text-lg leading-tight truncate">{pass.participant_name}</div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-accent border border-border">
                {pass.entry_number}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  statusStyles[pass.status] ?? statusStyles.pending
                }`}
              >
                {pass.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <Info label="Competition" value={pass.competition} />
          <Info label="Category" value={pass.category} />
          {pass.sub_category && <Info label="Sub-category" value={pass.sub_category} />}
          {pass.event_date && <Info label="Date" value={pass.event_date} icon={<Calendar className="h-3 w-3" />} />}
          {pass.reporting_time && (
            <Info label="Reporting" value={pass.reporting_time} icon={<Clock className="h-3 w-3" />} />
          )}
          {pass.performance_time && <Info label="Performance" value={pass.performance_time} />}
          {pass.venue && <Info label="Venue" value={pass.venue} icon={<MapPin className="h-3 w-3" />} />}
          {pass.hall && <Info label="Hall" value={pass.hall} />}
          {pass.stage && <Info label="Stage" value={pass.stage} />}
          {pass.entry_gate && <Info label="Gate" value={pass.entry_gate} icon={<Ticket className="h-3 w-3" />} />}
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 items-center pt-3 border-t border-dashed border-border">
          <div className="rounded-xl bg-white p-3 shadow-soft print:shadow-none">
            <div className="h-[150px] w-[150px] sm:h-[180px] sm:w-[180px] lg:h-[210px] lg:w-[210px] print:h-[190px] print:w-[190px]">
              <QRCodeSVG
                value={verifyUrl}
                size={768}
                level="M"
                marginSize={4}
                bgColor="#ffffff"
                fgColor="#000000"
                className="block h-full w-full"
                shapeRendering="crispEdges"
              />
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Scan to verify</div>
            <div className="rounded-md bg-white p-2 overflow-hidden">
              <svg ref={barcodeRef} className="w-full h-10" />
            </div>
            <div className="text-[10px] text-muted-foreground truncate font-mono">{pass.id.slice(0, 18)}…</div>
          </div>
        </div>
      </div>

      <div className="bg-accent/50 px-6 py-3 text-[10px] text-muted-foreground flex justify-between border-t border-border">
        <span>Non-transferable • Present at gate</span>
        <span>talentfest.in</span>
      </div>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}
