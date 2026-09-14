"use client";

import { useEffect, useRef, useState } from "react";
import { GripVertical, Image as ImageIcon, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/db/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GalleryCity = { id: string; name: string; slug: string; display_order: number };
type GalleryMedia = { id: string; city_id: string | null; title: string; media_url: string; thumbnail_url?: string | null; display_order: number; storage_path?: string | null };
type SelectedFile = { id: string; file: File; preview: string };
type Props = { cities: GalleryCity[]; media: GalleryMedia[]; dataError: string; onRefresh: () => Promise<void>; logActivity: (action: string) => Promise<void>; setConfirmAction: (value: { title: string; description: string; action: () => Promise<void> } | null) => void };

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 8 * 1024 * 1024;

export function GalleryAdminView({ cities, media, dataError, onRefresh, logActivity, setConfirmAction }: Props) {
  const [cityName, setCityName] = useState("");
  const [cityDialogOpen, setCityDialogOpen] = useState(false);
  const [savingCity, setSavingCity] = useState(false);
  const [selectedCity, setSelectedCity] = useState<GalleryCity | null>(null);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cityMedia = selectedCity ? media.filter((item) => item.city_id === selectedCity.id).sort((a, b) => a.display_order - b.display_order) : [];
  const mediaCount = (cityId: string) => media.filter((item) => item.city_id === cityId).length;

  useEffect(() => () => files.forEach(({ preview }) => URL.revokeObjectURL(preview)), [files]);

  const addCity = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = cityName.trim();
    const slug = slugify(name);
    if (!name || !slug) return toast.error("Enter a valid city name.");
    if (cities.some((city) => city.slug === slug)) return toast.error("This city already exists.");
    setSavingCity(true);
    try {
      const { error } = await db.from("gallery_cities").insert({ name, slug, display_order: cities.length + 1, is_active: true } as never);
      if (error) throw error;
      await logActivity(`Added gallery city ${name}`);
      setCityName("");
      setCityDialogOpen(false);
      toast.success("City added");
      await onRefresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to add city."); } finally { setSavingCity(false); }
  };

  const selectFiles = (incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter((file) => {
      if (!acceptedTypes.has(file.type) || file.size > maxFileSize) { toast.error(`${file.name}: use JPEG, PNG, or WebP up to 8MB.`); return false; }
      return true;
    });
    setFiles((current) => [...current, ...valid.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))]);
  };

  const uploadPhotos = async () => {
    if (!selectedCity || files.length === 0) return;
    setUploading(true);
    try {
      for (const [index, selected] of files.entries()) {
        const extension = selected.file.name.split(".").pop()?.toLowerCase() || "webp";
        const baseName = slugify(selected.file.name.replace(/\.[^.]+$/, "")) || "photo";
        const path = `${selectedCity.slug}/${Date.now()}-${index}-${baseName}.${extension}`;
        const { error: storageError } = await db.storage.from("gallery-images").upload(path, selected.file, { contentType: selected.file.type, upsert: false });
        if (storageError) throw storageError;
        const { data: url } = db.storage.from("gallery-images").getPublicUrl(path);
        const { error: recordError } = await db.from("gallery_media").insert({ city_id: selectedCity.id, title: selected.file.name.replace(/\.[^.]+$/, ""), media_type: "photo", category: "Photos", media_url: url.publicUrl, thumbnail_url: url.publicUrl, storage_path: path, display_order: cityMedia.length + index + 1, is_active: true } as never);
        if (recordError) throw recordError;
      }
      await logActivity(`Added ${files.length} photo${files.length === 1 ? "" : "s"} to ${selectedCity.name}`);
      files.forEach(({ preview }) => URL.revokeObjectURL(preview)); setFiles([]); toast.success("Photos uploaded"); await onRefresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Some photos could not be uploaded."); await onRefresh(); } finally { setUploading(false); }
  };

  const deletePhoto = async (item: GalleryMedia) => {
    const { error } = await db.from("gallery_media").delete().eq("id", item.id);
    if (error) throw error;
    if (item.storage_path && !item.storage_path.startsWith("legacy:")) { const { error: storageError } = await db.storage.from("gallery-images").remove([item.storage_path]); if (storageError) toast.error("Photo record deleted, but its storage file could not be removed."); }
    await logActivity(`Deleted gallery photo ${item.title}`); toast.success("Photo deleted"); await onRefresh();
  };

  const reorder = async (targetId: string) => {
    if (!draggedId || draggedId === targetId || !selectedCity) return setDraggedId(null);
    const from = cityMedia.findIndex((item) => item.id === draggedId), to = cityMedia.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return setDraggedId(null);
    const ordered = [...cityMedia]; ordered.splice(to, 0, ordered.splice(from, 1)[0]);
    try { await Promise.all(ordered.map((item, index) => db.from("gallery_media").update({ display_order: index + 1 } as never).eq("id", item.id))); toast.success("Photo order saved"); await onRefresh(); } catch { toast.error("Unable to save photo order."); } finally { setDraggedId(null); }
  };

  if (dataError) return <Card className="border-primary/25 bg-primary/10 p-4 text-sm text-muted-foreground">Gallery data could not load: {dataError}</Card>;
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-end"><Button onClick={() => setCityDialogOpen(true)}><Plus className="h-4 w-4" /> Add City</Button></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cities.map((city) => <Card key={city.id}><CardContent className="flex items-center justify-between gap-4 p-5"><div><h3 className="font-semibold">{city.name}</h3><p className="mt-1 text-sm text-muted-foreground">{mediaCount(city.id)} Photo{mediaCount(city.id) === 1 ? "" : "s"}</p></div><Button variant="outline" onClick={() => setSelectedCity(city)}>Manage Photos</Button></CardContent></Card>)}</div>
    {cities.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No gallery cities have been added yet.</CardContent></Card>}
    <Dialog open={cityDialogOpen} onOpenChange={setCityDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add City</DialogTitle></DialogHeader><form onSubmit={addCity} className="space-y-4"><div className="space-y-2"><Label htmlFor="gallery-city-name">City Name</Label><Input id="gallery-city-name" value={cityName} onChange={(event) => setCityName(event.target.value)} placeholder="Vadodara" autoFocus /></div><Button type="submit" disabled={savingCity}>{savingCity && <Loader2 className="h-4 w-4 animate-spin" />} Save City</Button></form></DialogContent></Dialog>
    <Dialog open={Boolean(selectedCity)} onOpenChange={(open) => !open && setSelectedCity(null)}><DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto"><DialogHeader><button className="w-fit text-sm text-muted-foreground hover:text-primary" onClick={() => setSelectedCity(null)}>← Back to Gallery Cities</button><DialogTitle>{selectedCity?.name} Gallery</DialogTitle></DialogHeader><div className="flex flex-wrap gap-3"><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => selectFiles(event.target.files ?? [])} /><Button onClick={() => inputRef.current?.click()}><Upload className="h-4 w-4" /> Add Photos</Button>{files.length > 0 && <Button onClick={uploadPhotos} disabled={uploading}>{uploading && <Loader2 className="h-4 w-4 animate-spin" />} Upload {files.length} Photo{files.length === 1 ? "" : "s"}</Button>}</div><div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFiles(event.dataTransfer.files); }} className="rounded-xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">Drag and drop JPEG, PNG, or WebP photos here (up to 8MB each).</div>{files.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{files.map((file) => <div key={file.id} className="relative overflow-hidden rounded-lg border"><img src={file.preview} alt="Selected upload preview" className="aspect-square w-full object-cover" /><button className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white" onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))} aria-label="Remove selected photo"><X className="h-4 w-4" /></button></div>)}</div>}<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{cityMedia.map((item) => <div key={item.id} draggable onDragStart={() => setDraggedId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => void reorder(item.id)} className="overflow-hidden rounded-xl border border-border bg-card"><img src={item.thumbnail_url ?? item.media_url} alt={item.title || "Gallery photo"} className="aspect-square w-full object-cover" /><div className="flex items-center justify-between gap-2 p-2"><span className="inline-flex text-xs text-muted-foreground"><GripVertical className="h-4 w-4" /> Drag</span><Button variant="ghost" size="sm" danger onClick={() => setConfirmAction({ title: "Delete photo?", description: "This photo will be removed from the gallery.", action: () => deletePhoto(item) })}><Trash2 className="h-4 w-4" /> Delete</Button></div></div>)}</div>{cityMedia.length === 0 && <div className="py-10 text-center text-muted-foreground"><ImageIcon className="mx-auto mb-3 h-8 w-8 text-primary" />No photos yet. Add photos to this city.</div>}</DialogContent></Dialog>
  </div>;
}
