import { useState } from "react";
import { Download, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  alt: string;
  emptyText: string;
  filename: string;
  label: string;
  src?: string | null;
};

export function EmployeeAwardImageActions({ alt, emptyText, filename, label, src }: Props) {
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const available = Boolean(src) && !failed;

  return (
    <section className="rounded-2xl border border-border bg-background/40 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      {available ? (
        <>
          <img src={src!} alt={alt} onError={() => setFailed(true)} className="mt-3 h-28 w-full rounded-xl border border-border object-contain p-2" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}><Eye className="h-4 w-4" /> View</Button>
            <Button asChild type="button" size="sm" variant="outline"><a href={src!} download={filename}><Download className="h-4 w-4" /> Download</a></Button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
              <DialogHeader><DialogTitle>{label}</DialogTitle><DialogDescription>{filename}</DialogDescription></DialogHeader>
              <img src={src!} alt={alt} onError={() => { setFailed(true); setOpen(false); }} className="max-h-[65vh] w-full object-contain" />
              <div className="flex justify-end"><Button asChild><a href={src!} download={filename}><Download className="h-4 w-4" /> Download</a></Button></div>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="mt-3 grid h-28 place-items-center rounded-xl border border-dashed border-border px-4 text-center text-xs text-muted-foreground">{emptyText}</div>
      )}
    </section>
  );
}
