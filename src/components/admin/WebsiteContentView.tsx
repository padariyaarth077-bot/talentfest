import { useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { db } from "@/db/client";

type Kind = "team" | "projects" | "sponsorship";
type Row = Record<string, any>;
const config: Record<Kind, { table: string; title: string; fileLabel: string; accept: string; fields: string[] }> = {
  team: { table: "team_members", title: "Team", fileLabel: "Photo", accept: "image/jpeg,image/png,image/webp", fields: ["name", "designation"] },
  projects: { table: "projects", title: "Projects", fileLabel: "Banner", accept: "image/jpeg,image/png,image/webp", fields: ["title", "subtitle", "label", "link_url"] },
  sponsorship: { table: "sponsorship_documents", title: "Sponsorship", fileLabel: "PDF", accept: "application/pdf", fields: ["name"] },
};
const labels: Record<string, string> = { name: "Name", designation: "Designation", title: "Project title", subtitle: "Short description", label: "Label", link_url: "Optional link" };
const itemName = (kind: Kind) => kind === "team" ? "team member" : kind === "projects" ? "project" : "document";
const fileUrl = (kind: Kind, row: Row) => kind === "team" ? row.photo_url : kind === "projects" ? row.banner_url : row.file_url;
const filePath = (kind: Kind, row: Row) => kind === "team" ? row.photo_path : kind === "projects" ? row.banner_path : row.file_path;

export function WebsiteContentView({ onOpenBlog }: { onOpenBlog: () => void }) {
  const [kind, setKind] = useState<Kind>("team"), [rows, setRows] = useState<Row[]>([]), [editing, setEditing] = useState<Row | null>(null), [open, setOpen] = useState(false), [deleteTarget, setDeleteTarget] = useState<Row | null>(null), [form, setForm] = useState<Record<string, string>>({}), [file, setFile] = useState<File | null>(null), [removeFile, setRemoveFile] = useState(false), [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null), current = config[kind], name = itemName(kind);
  const load = async () => { const result = await (db as any).from(current.table).select("*").order("display_order", { ascending: true }).order("created_at", { ascending: true }); if (result.error) throw result.error; setRows(result.data ?? []); };
  const close = () => { setOpen(false); setEditing(null); setForm({}); setFile(null); setRemoveFile(false); if (inputRef.current) inputRef.current.value = ""; };
  useEffect(() => { close(); void load().catch((e) => toast.error(e.message ?? "Unable to load content.")); }, [kind]);
  const edit = (row: Row) => { setEditing(row); setForm(Object.fromEntries(current.fields.map((key) => [key, row[key] ?? ""]))); setFile(null); setRemoveFile(false); setOpen(true); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); const required = kind === "projects" ? "title" : "name";
    if (!form[required]?.trim()) return toast.error(`${labels[required]} is required.`);
    if (file && (!file.type.match(kind === "sponsorship" ? /^application\/pdf$/ : /^image\/(jpeg|png|webp)$/) || file.size > 8 * 1024 * 1024)) return toast.error("Choose a supported file up to 8 MB.");
    setSaving(true); try {
      let url = editing && !removeFile ? fileUrl(kind, editing) : "", path = editing && !removeFile ? filePath(kind, editing) : "";
      if (file) { const extension = file.name.split(".").pop() || "file"; path = `${kind}/${crypto.randomUUID()}.${extension}`; const uploaded = await db.storage.from("website-content").upload(path, file); if (uploaded.error) throw uploaded.error; url = db.storage.from("website-content").getPublicUrl(path).data.publicUrl; }
      const payload: Row = { ...form, display_order: editing?.display_order ?? rows.length + 1, updated_at: new Date().toISOString() };
      if (kind === "team") Object.assign(payload, { photo_url: url || null, photo_path: path || null });
      if (kind === "projects") Object.assign(payload, { banner_url: url || null, banner_path: path || null });
      if (kind === "sponsorship") { if (!url || !path) throw new Error("A PDF is required."); Object.assign(payload, { file_url: url, file_path: path }); }
      const result = editing ? await (db as any).from(current.table).update(payload).eq("id", editing.id) : await (db as any).from(current.table).insert(payload); if (result.error) throw result.error;
      const oldPath = editing && filePath(kind, editing); if ((file || removeFile) && oldPath && oldPath !== path && !oldPath.startsWith("legacy/")) await db.storage.from("website-content").remove([oldPath]);
      toast.success(`${name} saved.`); close(); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to save content."); } finally { setSaving(false); }
  };
  const remove = async () => { if (!deleteTarget) return; try { const result = await (db as any).from(current.table).delete().eq("id", deleteTarget.id); if (result.error) throw result.error; const path = filePath(kind, deleteTarget); if (path && !path.startsWith("legacy/")) await db.storage.from("website-content").remove([path]); toast.success(`${name} deleted.`); setDeleteTarget(null); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Unable to delete content."); } };
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{(Object.keys(config) as Kind[]).map((key) => <Button key={key} variant={kind === key ? "default" : "outline"} onClick={() => setKind(key)}>{config[key].title}</Button>)}<Button variant="outline" onClick={onOpenBlog}>Blog</Button></div><Button onClick={() => { close(); setOpen(true); }}><Plus className="h-4 w-4" /> Add {name}</Button></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <div key={row.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex gap-3">{kind === "sponsorship" ? <FileText className="h-10 w-10 shrink-0 text-primary" /> : fileUrl(kind, row) ? <img src={fileUrl(kind, row)} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" /> : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{(row.name ?? row.title ?? "?").slice(0, 1)}</div>}<div className="min-w-0"><div className="truncate font-semibold">{row.name ?? row.title}</div><div className="line-clamp-2 text-sm text-muted-foreground">{row.designation ?? row.subtitle ?? (kind === "sponsorship" ? "PDF document" : row.label)}</div></div></div><div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={() => edit(row)}><Pencil className="h-4 w-4" /> Edit</Button><Button size="sm" variant="outline" danger onClick={() => setDeleteTarget(row)}><Trash2 className="h-4 w-4" /> Delete</Button></div></div>)}</div>
    <Dialog open={open} onOpenChange={(value) => !value && close()}><DialogContent className="max-w-2xl rounded-2xl border-primary/25 bg-[#0b1524] p-6"><DialogHeader><DialogTitle>{editing ? `Edit ${name}` : `Add ${name}`}</DialogTitle><DialogDescription>{editing ? "Update the details below, then save your changes." : `Add a new ${name} to the website.`}</DialogDescription></DialogHeader><form onSubmit={save} className="grid gap-4 md:grid-cols-2">{current.fields.map((field) => <input key={field} value={form[field] ?? ""} onChange={(e) => setForm((old) => ({ ...old, [field]: e.target.value }))} placeholder={labels[field]} className="field-input" />)}<div className="flex flex-wrap items-center gap-2 md:col-span-2"><input ref={inputRef} type="file" accept={current.accept} className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRemoveFile(false); }} /><Button type="button" variant="outline" onClick={() => inputRef.current?.click()}><ImagePlus className="h-4 w-4" /> {file ? file.name : editing ? `Change ${current.fileLabel}` : `Upload ${current.fileLabel}`}</Button>{file && <Button type="button" variant="outline" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}>Remove selected</Button>}{editing && fileUrl(kind, editing) && !removeFile && <>{kind === "sponsorship" ? <a href={fileUrl(kind, editing)} target="_blank" rel="noreferrer" className="text-sm text-primary">View current PDF</a> : <Button type="button" variant="outline" onClick={() => setRemoveFile(true)}>Remove current</Button>}</>}</div><DialogFooter className="md:col-span-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : `Add ${name}`}</Button></DialogFooter></form></DialogContent></Dialog>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(value) => !value && setDeleteTarget(null)}><AlertDialogContent className="rounded-2xl border-primary/25 bg-[#0b1524]"><AlertDialogHeader><AlertDialogTitle>Delete {name}?</AlertDialogTitle><AlertDialogDescription>This removes it from the website. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void remove()}>Delete {name}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
