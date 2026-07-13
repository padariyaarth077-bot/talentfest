"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import {
  Plus,
  Pencil,
  Trash2,
  RefreshCcw,
  Upload,
  Download,
  Eye,
  Film,
  Image as ImageIcon,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  GripVertical,
  Move,
  Replace,
  X,
  Minus,
  Copy,
  Check,
  Loader2,
  RotateCcw,
} from "lucide-react";


type GalleryCity = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string | null;
};

type GalleryMedia = {
  id: string;
  city_id: string | null;
  title: string;
  media_type: "photo" | "video";
  category: string;
  media_url: string;
  thumbnail_url?: string | null;
  description?: string | null;
  display_order: number;
  is_active: boolean;
  is_featured?: boolean;
  fit_mode?: "contain" | "cover";
  fit_position?: "center" | "top" | "bottom" | "left" | "right";
  width?: number;
  height?: number;
  storage_path?: string;
  alt_text?: string;
  created_at?: string;
  updated_at?: string | null;
};

type GalleryCityForm = {
  name: string;
  slug: string;
  display_order: string;
  is_active: boolean;
};

type GalleryMediaForm = {
  title: string;
  city_id: string;
  media_type: "photo" | "video";
  category: string;
  media_url: string;
  thumbnail_url: string;
  description: string;
  display_order: string;
  is_active: boolean;
  is_featured: boolean;
  fit_mode: "contain" | "cover";
  fit_position: "center" | "top" | "bottom" | "left" | "right";
  alt_text: string;
};

type UploadFile = {
  file: File;
  preview: string;
  id: string;
  status: "pending" | "uploading" | "complete" | "error";
  progress: number;
  error?: string;
  mediaRecord?: GalleryMedia;
};

function emptyCityForm(cities: GalleryCity[]): GalleryCityForm {
  return {
    name: "",
    slug: "",
    display_order: String(cities.length + 1),
    is_active: true,
  };
}

function cityToForm(city: GalleryCity): GalleryCityForm {
  return {
    name: city.name,
    slug: city.slug,
    display_order: String(city.display_order),
    is_active: city.is_active,
  };
}

function emptyMediaForm(cities: GalleryCity[]): GalleryMediaForm {
  return {
    title: "",
    city_id: cities[0]?.id || "",
    media_type: "photo",
    category: "Photos",
    media_url: "",
    thumbnail_url: "",
    description: "",
    display_order: "0",
    is_active: true,
    is_featured: false,
    fit_mode: "contain",
    fit_position: "center",
    alt_text: "",
  };
}

function mediaToForm(media: GalleryMedia): GalleryMediaForm {
  return {
    title: media.title,
    city_id: media.city_id || "",
    media_type: media.media_type,
    category: media.category,
    media_url: media.media_url,
    thumbnail_url: media.thumbnail_url || "",
    description: media.description || "",
    display_order: String(media.display_order),
    is_active: media.is_active,
    is_featured: media.is_featured || false,
    fit_mode: media.fit_mode || "contain",
    fit_position: media.fit_position || "center",
    alt_text: media.alt_text || "",
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface GalleryAdminViewProps {
  cities: GalleryCity[];
  media: GalleryMedia[];
  dataError: string;
  onRefresh: () => Promise<void>;
  logActivity: (action: string) => Promise<void>;
  setConfirmAction: (
    value: { title: string; description: string; action: () => Promise<void> } | null
  ) => void;
}

export function GalleryAdminView({
  cities,
  media,
  dataError,
  onRefresh,
  logActivity,
  setConfirmAction,
}: GalleryAdminViewProps) {
  const [editingCity, setEditingCity] = useState<GalleryCity | null>(null);
  const [cityForm, setCityForm] = useState<GalleryCityForm>(emptyCityForm(cities));
  const [editingMedia, setEditingMedia] = useState<GalleryMedia | null>(null);
  const [mediaForm, setMediaForm] = useState<GalleryMediaForm>(emptyMediaForm(cities));
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"cities" | "media" | "bulk">("cities");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "display_order",
    direction: "asc",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCityId, setUploadCityId] = useState<string>(cities[0]?.id || "");
  const [uploadCategory, setUploadCategory] = useState("Photos");
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkMoveCityId, setBulkMoveCityId] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");

  const mediaCount = (cityId: string) => media.filter((item) => item.city_id === cityId).length;

  const resetCityForm = () => {
    setEditingCity(null);
    setCityForm(emptyCityForm(cities));
  };

  const resetMediaForm = () => {
    setEditingMedia(null);
    setMediaForm(emptyMediaForm(cities));
  };

  const saveCity = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = cityForm.name.trim();
    const slug = slugify(cityForm.slug || name);
    if (!name || !slug) {
      toast.error("City name and slug are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        slug,
        display_order: Number(cityForm.display_order) || 0,
        is_active: cityForm.is_active,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (editingCity) {
        result = await supabase
          .from("gallery_cities")
          .update(payload as never)
          .eq("id", editingCity.id);
      } else {
        result = await supabase.from("gallery_cities").insert(payload as never);
      }

      if (result.error) throw result.error;
      await logActivity(editingCity ? `Updated gallery city ${name}` : `Added gallery city ${name}`);
      toast.success(editingCity ? "Gallery city updated" : "Gallery city added");
      resetCityForm();
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save gallery city.");
    } finally {
      setSaving(false);
    }
  };

  const saveMedia = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mediaForm.title.trim() || !mediaForm.city_id || !mediaForm.media_url.trim()) {
      toast.error("Media title, city, and media URL are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: mediaForm.title.trim(),
        city_id: mediaForm.city_id,
        media_type: mediaForm.media_type,
        category: mediaForm.category.trim() || "Photos",
        media_url: mediaForm.media_url.trim(),
        thumbnail_url: mediaForm.thumbnail_url.trim() || null,
        description: mediaForm.description.trim() || null,
        display_order: Number(mediaForm.display_order) || 0,
        is_active: mediaForm.is_active,
        is_featured: mediaForm.is_featured,
        fit_mode: mediaForm.fit_mode,
        fit_position: mediaForm.fit_position,
        alt_text: mediaForm.alt_text.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (editingMedia) {
        result = await supabase
          .from("gallery_media")
          .update(payload as never)
          .eq("id", editingMedia.id);
      } else {
        result = await supabase.from("gallery_media").insert(payload as never);
      }

      if (result.error) throw result.error;
      await logActivity(
        editingMedia ? `Updated gallery media ${payload.title}` : `Added gallery media ${payload.title}`
      );
      toast.success(editingMedia ? "Gallery media updated" : "Gallery media added");
      resetMediaForm();
      await onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save gallery media.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCity = async (city: GalleryCity) => {
    const { error } = await supabase
      .from("gallery_cities")
      .update({ is_active: !city.is_active, updated_at: new Date().toISOString() } as never)
      .eq("id", city.id);
    if (error) return toast.error(error.message);
    await logActivity(`${city.is_active ? "Disabled" : "Enabled"} gallery city ${city.name}`);
    toast.success(city.is_active ? "City disabled" : "City enabled");
    await onRefresh();
  };

  const deleteCity = async (city: GalleryCity) => {
    const { error } = await supabase.from("gallery_cities").delete().eq("id", city.id);
    if (error) throw error;
    await logActivity(`Deleted gallery city ${city.name}`);
    toast.success("Gallery city deleted");
    await onRefresh();
  };

  const deleteMedia = async (item: GalleryMedia) => {
    const { error } = await supabase.from("gallery_media").delete().eq("id", item.id);
    if (error) throw error;
    await logActivity(`Deleted gallery media ${item.title}`);
    toast.success("Gallery media deleted");
    await onRefresh();
  };

  const handleFileSelect = (files: FileList | File[]) => {
    const newFiles: UploadFile[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: crypto.randomUUID(),
      status: "pending" as const,
      progress: 0,
    }));
    setUploadFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.add("bg-primary/10", "border-primary");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove("bg-primary/10", "border-primary");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove("bg-primary/10", "border-primary");
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeUploadFile = (id: string) => {
    setUploadFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const retryUpload = async (id: string) => {
    const file = uploadFiles.find((f) => f.id === id);
    if (!file) return;
    setUploadFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "pending" as const, progress: 0, error: undefined } : f))
    );
    await uploadSingleFile(file);
  };

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    setUploadFiles((prev) =>
      prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "uploading" as const, progress: 0 } : f))
    );

    try {
      const city = cities.find((c) => c.id === uploadCityId);
      const citySlug = city?.slug || "unknown";
      const year = new Date().getFullYear();
      const ext = uploadFile.file.name.split(".").pop()?.toLowerCase() || "webp";
      const safeName = uploadFile.file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .toLowerCase()
        .slice(0, 50);
      const timestamp = Date.now();
      const storagePath = `gallery-images/${citySlug}/${year}/${timestamp}-${safeName}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery-images")
        .upload(storagePath, uploadFile.file, {
          contentType: uploadFile.file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("gallery-images").getPublicUrl(storagePath);
      const mediaUrl = publicUrlData.publicUrl;

      const { data: mediaRecord, error: insertError } = await supabase
        .from("gallery_media")
        .insert({
          title: uploadFile.file.name.replace(/\.[^/.]+$/, ""),
          city_id: uploadCityId,
          media_type: "photo",
          category: uploadCategory,
          media_url: mediaUrl,
          thumbnail_url: mediaUrl,
          storage_path: storagePath,
          display_order: 0,
          is_active: true,
          is_featured: false,
          fit_mode: "contain",
          fit_position: "center",
          alt_text: uploadFile.file.name,
        } as never)
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "complete" as const, progress: 100, mediaRecord }
            : f
        )
      );

      toast.success(`Uploaded: ${uploadFile.file.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: "error" as const, error: message } : f
        )
      );
      toast.error(`Failed to upload ${uploadFile.file.name}: ${message}`);
    }
  };

  const uploadAllFiles = async () => {
    const pendingFiles = uploadFiles.filter((f) => f.status === "pending" || f.status === "error");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    const concurrency = 3;
    for (let i = 0; i < pendingFiles.length; i += concurrency) {
      const batch = pendingFiles.slice(i, i + concurrency);
      await Promise.all(batch.map(uploadSingleFile));
    }
    setIsUploading(false);
    await onRefresh();
    toast.success("All uploads completed");
  };

  const handleBulkAction = async () => {
    if (selectedMedia.length === 0) {
      toast.error("No media items selected");
      return;
    }

    const confirm = window.confirm(
      `Apply "${bulkAction}" to ${selectedMedia.length} selected items?`
    );
    if (!confirm) return;

    try {
      const updates: Record<string, unknown> = {};
      switch (bulkAction) {
        case "activate":
          updates.is_active = true;
          break;
        case "deactivate":
          updates.is_active = false;
          break;
        case "feature":
          updates.is_featured = true;
          break;
        case "unfeature":
          updates.is_featured = false;
          break;
        case "move":
          if (!bulkMoveCityId) {
            toast.error("Select a target city");
            return;
          }
          updates.city_id = bulkMoveCityId;
          break;
        case "category":
          if (!bulkCategory) {
            toast.error("Enter a category");
            return;
          }
          updates.category = bulkCategory;
          break;
        case "delete":
          const { error } = await supabase
            .from("gallery_media")
            .delete()
            .in("id", selectedMedia);
          if (error) throw error;
          toast.success(`Deleted ${selectedMedia.length} items`);
          setSelectedMedia([]);
          await onRefresh();
          return;
        default:
          return;
      }

      if (Object.keys(updates).length > 0 && bulkAction !== "delete") {
        updates.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from("gallery_media")
          .update(updates as never)
          .in("id", selectedMedia);
        if (error) throw error;
        toast.success(`Updated ${selectedMedia.length} items`);
        setSelectedMedia([]);
        await onRefresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk action failed");
    }
  };

  // Drag and drop reordering
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleReorderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleReorderDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedMedia = media.find((m) => m.id === draggedId);
    const targetMedia = media.find((m) => m.id === targetId);
    if (!draggedMedia || !targetMedia) {
      setDraggedId(null);
      return;
    }

    const draggedOrder = draggedMedia.display_order;
    const targetOrder = targetMedia.display_order;

    const updates = [
      supabase.from("gallery_media").update({ display_order: targetOrder } as never).eq("id", draggedId),
      supabase.from("gallery_media").update({ display_order: draggedOrder } as never).eq("id", targetId),
    ];

    try {
      await Promise.all(updates);
      toast.success("Order updated");
      await onRefresh();
    } catch (error) {
      toast.error("Failed to reorder");
    } finally {
      setDraggedId(null);
    }
  };

  // Derived categories for filter
  const categories = Array.from(new Set(media.map((m) => m.category).filter(Boolean))).sort();

  // Filtered media
  const filteredMedia = media
    .filter((m) => {
      if (cityFilter !== "all" && m.city_id !== cityFilter) return false;
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      if (statusFilter === "active" && !m.is_active) return false;
      if (statusFilter === "inactive" && m.is_active) return false;
      if (statusFilter === "featured" && !m.is_featured) return false;
      if (statusFilter === "unfeatured" && m.is_featured) return false;
      if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortConfig.key as keyof GalleryMedia];
      const bVal = b[sortConfig.key as keyof GalleryMedia];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const requestSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleSelect = (id: string) => {
    setSelectedMedia((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedMedia.length === filteredMedia.length) {
      setSelectedMedia([]);
    } else {
      setSelectedMedia(filteredMedia.map((m) => m.id));
    }
  };

  
  if (dataError) {
    return (
      <Card className="border-primary/25 bg-primary/10 p-4 text-sm text-muted-foreground">
        Gallery database tables are not ready yet. Review and run the gallery SQL migration, then
        refresh. Supabase said: {dataError}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {dataError && (
        <Card className="border-primary/25 bg-primary/10 p-4 text-sm text-muted-foreground">
          Gallery database tables are not ready yet. Review and run the gallery SQL migration, then refresh.
          <pre className="mt-2 p-3 bg-background rounded text-xs overflow-auto">{dataError}</pre>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cities">Cities</TabsTrigger>
          <TabsTrigger value="media">Media Library</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
        </TabsList>

        {/* CITIES TAB */}
        <TabsContent value="cities">
          <Card>
            <CardHeader>
              <CardTitle>Gallery Cities</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveCity} className="mb-6 grid gap-3 lg:grid-cols-[1fr_1fr_120px_140px_auto]">
                <Input
                  value={cityForm.name}
                  onChange={(e) =>
                    setCityForm((c) => ({
                      ...c,
                      name: e.target.value,
                      slug: editingCity ? c.slug : slugify(e.target.value),
                    }))
                  }
                  placeholder="City name"
                  className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Input
                  value={cityForm.slug}
                  onChange={(e) => setCityForm((c) => ({ ...c, slug: slugify(e.target.value) }))}
                  placeholder="city-slug"
                  className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Input
                  value={cityForm.display_order}
                  onChange={(e) => setCityForm((c) => ({ ...c, display_order: e.target.value }))}
                  placeholder="Order"
                  inputMode="numeric"
                  className="rounded-xl border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Label className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm">
                  <Input
                    type="checkbox"
                    checked={cityForm.is_active}
                    onChange={(e) => setCityForm((c) => ({ ...c, is_active: e.target.checked }))}
                    className="h-4 w-4 accent-primary"
                  />
                  Active
                </Label>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    <Plus className="h-4 w-4" />
                    {editingCity ? "Update" : "Add"}
                  </Button>
                  {editingCity && (
                    <Button type="button" variant="outline" onClick={resetCityForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>

              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">City</th>
                      <th className="px-4 py-3 text-left">Slug</th>
                      <th className="px-4 py-3 text-left">Order</th>
                      <th className="px-4 py-3 text-left">Media Items</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cities.map((city) => (
                      <tr key={city.id} className="border-t border-border/60">
                        <td className="px-4 py-3 font-medium">{city.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{city.slug}</td>
                        <td className="px-4 py-3">{city.display_order}</td>
                        <td className="px-4 py-3">{mediaCount(city.id)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs",
                              city.is_active
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                : "border-border text-muted-foreground"
                            )}
                          >
                            {city.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCity(city);
                                setCityForm(cityToForm(city));
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCity(city)}
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              danger
                              onClick={() =>
                                setConfirmAction({
                                  title: "Delete gallery city?",
                                  description:
                                    "This removes the city record only. Media files and media records are preserved.",
                                  action: () => deleteCity(city),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cities.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No gallery cities have been added yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEDIA LIBRARY TAB */}
        <TabsContent value="media">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Media Library</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search titles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="unfeatured">Not Featured</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setActiveTab("bulk")}>
                  <Upload className="h-4 w-4 mr-1" />
                  Bulk Upload
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedMedia.length > 0 && (
                <div className="mb-4 p-3 rounded-xl border border-primary/30 bg-primary/10 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium">
                    {selectedMedia.length} item{selectedMedia.length > 1 ? "s" : ""} selected
                  </span>
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Bulk action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activate">Activate</SelectItem>
                      <SelectItem value="deactivate">Deactivate</SelectItem>
                      <SelectItem value="feature">Mark Featured</SelectItem>
                      <SelectItem value="unfeature">Unfeature</SelectItem>
                      <SelectItem value="move">Move to City</SelectItem>
                      <SelectItem value="category">Set Category</SelectItem>
                      <SelectItem value="delete" className="text-destructive focus:text-destructive">
                        Delete
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {bulkAction === "move" && (
                    <Select value={bulkMoveCityId} onValueChange={setBulkMoveCityId}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Target city" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {bulkAction === "category" && (
                    <Input
                      placeholder="Category name"
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      className="w-48"
                    />
                  )}
                  <Button
                    onClick={handleBulkAction}
                    disabled={!bulkAction || (bulkAction === "move" && !bulkMoveCityId) || (bulkAction === "category" && !bulkCategory)}
                  >
                    Apply
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMedia([])}>
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={selectedMedia.length === filteredMedia.length && filteredMedia.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 accent-primary"
                        />
                      </th>
                      <th
                        className="px-4 py-3 text-left cursor-pointer hover:text-primary"
                        onClick={() => requestSort("title")}
                      >
                        Preview
                        {sortConfig.key === "title" && (
                          <span className="ml-1">{sortConfig.direction === "asc" ? "▲" : "▼"}</span>
                        )}
                      </th>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">City</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Order</th>
                      <th className="px-4 py-3 text-left">Featured</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Fit</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMedia.map((item) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "border-t border-border/60",
                          selectedMedia.includes(item.id) && "bg-primary/5"
                        )}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragOver={handleReorderDragOver}
                        onDrop={(e) => handleDrop(e, item.id)}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedMedia.includes(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="h-4 w-4 accent-primary"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="relative aspect-[3/4] w-20 rounded-lg overflow-hidden bg-[#080808] border border-primary/20"
                            draggable="false"
                          >
                            <img
                              src={item.thumbnail_url || item.media_url}
                              alt={item.title}
                              className="h-full w-full object-cover object-center"
                              loading="lazy"
                              draggable="false"
                            />
                            {item.is_featured && (
                              <span className="absolute top-1 left-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950">
                                ★
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-medium truncate">{item.title}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {cities.find((c) => c.id === item.city_id)?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">{item.category}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.display_order}
                            onChange={(e) => {
                              const newOrder = Number(e.target.value) || 0;
                              supabase
                                .from("gallery_media")
                                .update({ display_order: newOrder } as never)
                                .eq("id", item.id);
                            }}
                            className="w-16 rounded border border-border bg-background/70 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Label className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm cursor-pointer">
                            <Input
                              type="checkbox"
                              checked={item.is_featured || false}
                              onChange={(e) => {
                                supabase
                                  .from("gallery_media")
                                  .update({ is_featured: e.target.checked } as never)
                                  .eq("id", item.id);
                              }}
                              className="h-4 w-4 accent-primary"
                            />
                            <span>Featured</span>
                          </Label>
                        </td>
                        <td className="px-4 py-3">
                          <Label className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm cursor-pointer">
                            <Input
                              type="checkbox"
                              checked={item.is_active}
                              onChange={(e) => {
                                supabase
                                  .from("gallery_media")
                                  .update({ is_active: e.target.checked } as never)
                                  .eq("id", item.id);
                              }}
                              className="h-4 w-4 accent-primary"
                            />
                            <span>{item.is_active ? "Active" : "Inactive"}</span>
                          </Label>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <Select
                            value={item.fit_mode || "contain"}
                            onValueChange={(v) => {
                              supabase
                                .from("gallery_media")
                                .update({ fit_mode: v } as never)
                                .eq("id", item.id);
                            }}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="contain">Show Full</SelectItem>
                              <SelectItem value="cover">Fill Card</SelectItem>
                            </SelectContent>
                          </Select>
                          {item.fit_mode === "cover" && (
                            <Select
                              value={item.fit_position || "center"}
                              onValueChange={(v) => {
                                supabase
                                  .from("gallery_media")
                                  .update({ fit_position: v } as never)
                                  .eq("id", item.id);
                              }}
                            >
                              <SelectTrigger className="w-24 ml-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="top">Top</SelectItem>
                                <SelectItem value="bottom">Bottom</SelectItem>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-96 p-4" align="end">
                                <h4 className="font-semibold mb-3">Edit: {item.title}</h4>
                                <form onSubmit={saveMedia} className="space-y-3">
                                  <Input
                                    value={item.title}
                                    onChange={(e) => setMediaForm((f) => ({ ...f, title: e.target.value }))}
                                    placeholder="Title"
                                  />
                                  <Select
                                    value={mediaForm.city_id}
                                    onValueChange={(v) => setMediaForm((f) => ({ ...f, city_id: v }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="City" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {cities.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                          {c.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Textarea
                                    value={item.description || ""}
                                    onChange={(e) =>
                                      setMediaForm((f) => ({ ...f, description: e.target.value }))
                                    }
                                    placeholder="Description"
                                    rows={2}
                                  />
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <Input
                                      value={mediaForm.fit_mode}
                                      onChange={(e) => setMediaForm((f) => ({ ...f, fit_mode: e.target.value as "contain" | "cover" }))}
                                      placeholder="Fit mode"
                                    />
                                    <Input
                                      value={item.fit_position || "center"}
                                      onChange={(e) => setMediaForm((f) => ({ ...f, fit_position: e.target.value }))}
                                      placeholder="Position"
                                    />
                                  </div>
                                  <Label className="flex items-center gap-2">
                                    <Input
                                      type="checkbox"
                                      checked={item.is_featured || false}
                                      onChange={(e) =>
                                        supabase
                                          .from("gallery_media")
                                          .update({ is_featured: e.target.checked } as never)
                                          .eq("id", item.id)
                                      }
                                      className="h-4 w-4 accent-primary"
                                    />
                                    Featured
                                  </Label>
                                  <Label className="flex items-center gap-2">
                                    <Input
                                      type="checkbox"
                                      checked={item.is_active}
                                      onChange={(e) =>
                                        supabase
                                          .from("gallery_media")
                                          .update({ is_active: e.target.checked } as never)
                                          .eq("id", item.id)
                                      }
                                      className="h-4 w-4 accent-primary"
                                    />
                                    Active
                                  </Label>
                                  <Button type="submit" className="w-full">
                                    Save Changes
                                  </Button>
                                </form>
                              </PopoverContent>
                            </Popover>

                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Replace className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-4" align="end">
                                <h4 className="font-semibold mb-3">Replace Image</h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Current image will be replaced. Old file deleted after successful upload.
                                </p>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="mb-3"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const city = cities.find((c) => c.id === item.city_id);
                                    const citySlug = city?.slug || "unknown";
                                    const year = new Date().getFullYear();
                                    const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
                                    const timestamp = Date.now();
                                    const storagePath = `gallery-images/${citySlug}/${year}/${timestamp}-${file.name.replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").toLowerCase().slice(0, 50)}.${ext}`;

                                    const { error: uploadError } = await supabase.storage
                                      .from("gallery-images")
                                      .upload(storagePath, file, {
                                        contentType: file.type,
                                        upsert: false,
                                      });
                                    if (uploadError) {
                                      toast.error(uploadError.message);
                                      return;
                                    }

                                    const { data: publicUrlData } = supabase.storage
                                      .from("gallery-images")
                                      .getPublicUrl(storagePath);
                                    const mediaUrl = publicUrlData.publicUrl;

                                    const { error: updateError } = await supabase
                                      .from("gallery_media")
                                      .update({
                                        media_url: mediaUrl,
                                        thumbnail_url: mediaUrl,
                                        storage_path: storagePath,
                                        updated_at: new Date().toISOString(),
                                      } as never)
                                      .eq("id", item.id);
                                    if (updateError) {
                                      toast.error(updateError.message);
                                      return;
                                    }

                                    toast.success("Image replaced");
                                    await onRefresh();
                                  }}
                                />
                              </PopoverContent>
                            </Popover>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                supabase
                                  .from("gallery_media")
                                  .update({ display_order: item.display_order + 1 } as never)
                                  .eq("id", item.id)
                                  .then(() => onRefresh());
                              }}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                supabase
                                  .from("gallery_media")
                                  .update({ display_order: item.display_order - 1 } as never)
                                  .eq("id", item.id)
                                  .then(() => onRefresh());
                              }}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              danger
                              onClick={() =>
                                setConfirmAction({
                                  title: "Delete gallery item?",
                                  description: "This removes the media record. Storage file is not deleted.",
                                  action: () => deleteMedia(item),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {media.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No gallery media items have been added yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BULK UPLOAD TAB */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Image Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="block text-sm font-medium mb-2">Select City</Label>
                    <Select value={uploadCityId} onValueChange={setUploadCityId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose city" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-2">Category</Label>
                    <Input
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      placeholder="e.g., Winners, Performances, Ceremony"
                    />
                  </div>
                </div>

                <div
                  ref={dropZoneRef}
                  onDragOver={handleReorderDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "relative rounded-2xl border-2 border-dashed border-border p-8 text-center transition-colors",
                    uploadFiles.length > 0 && "border-primary/50 bg-primary/5"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files || [])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-lg font-medium">Drag & drop images here, or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports: JPEG, PNG, WebP • Max 8MB per image • Multiple files supported
                  </p>
                  {uploadFiles.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4"
                    >
                      Add More Files
                    </Button>
                  )}
                </div>

                {uploadFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Selected Files ({uploadFiles.length})</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {uploadFiles.map((uf) => (
                        <div
                          key={uf.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-background/40",
                            uf.status === "uploading" && "border-primary/50 bg-primary/5",
                            uf.status === "complete" && "border-emerald-500/50 bg-emerald-500/10",
                            uf.status === "error" && "border-destructive/50 bg-destructive/10"
                          )}
                        >
                          <img src={uf.preview} alt={uf.file.name} className="h-12 w-12 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-sm font-medium truncate">{uf.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(uf.file.size / 1024 / 1024).toFixed(2)} MB • {uf.file.type}
                            </p>
                            {uf.status === "uploading" && (
                              <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${uf.progress}%` }}
                                />
                              </div>
                            )}
                            {uf.status === "complete" && (
                              <div className="flex items-center gap-1 text-emerald-500 text-sm">
                                <Check className="h-4 w-4" />
                                Complete
                              </div>
                            )}
                            {uf.status === "error" && (
                              <div className="flex items-center gap-1 text-destructive text-sm">
                                <X className="h-4 w-4" />
                                {uf.error}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {uf.status === "pending" || uf.status === "error" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => retryUpload(uf.id)}
                                disabled={uf.status === "uploading"}
                              >
                                {uf.status === "uploading" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  uf.status === "error" ? (
                                    <>
                                      <RotateCcw className="h-4 w-4" />
                                      Retry
                                    </>
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  ))}
                              </Button>
                            ) : uf.status === "complete" && (
                              <Button variant="ghost" size="icon" onClick={() => {}}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              danger
                              onClick={() => removeUploadFile(uf.id)}
                              disabled={uf.status === "uploading"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          uploadFiles.forEach((uf) => URL.revokeObjectURL(uf.preview));
                          setUploadFiles([]);
                        }}
                      >
                        Clear All
                      </Button>
                      <Button
                        onClick={uploadAllFiles}
                        disabled={isUploading || uploadFiles.every((f) => f.status === "complete")}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload All ({uploadFiles.filter((f) => f.status !== "complete").length})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
