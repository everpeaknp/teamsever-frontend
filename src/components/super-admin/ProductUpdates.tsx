"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";

type Slide = { title: string; body: string; imageUrl?: string; ctaLabel?: string };
type Update = { _id: string; title: string; slides: Slide[]; status: "draft" | "published" };
const blankSlide = (): Slide => ({ title: "", body: "", imageUrl: "", ctaLabel: "" });

export default function ProductUpdates() {
  const [items, setItems] = useState<Update[]>([]);
  const [title, setTitle] = useState("");
  const [slides, setSlides] = useState<Slide[]>([blankSlide()]);
  const [editingId, setEditingId] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingSlide, setUploadingSlide] = useState<number | null>(null);
  const load = async () => { const r = await api.get("/super-admin/product-updates"); setItems(r.data.data || []); };
  useEffect(() => { load().catch(() => setError("Could not load product updates.")); }, []);
  const reset = () => { setEditingId(undefined); setTitle(""); setSlides([blankSlide()]); setError(""); };
  const edit = (item: Update) => { setEditingId(item._id); setTitle(item.title); setSlides(item.slides.map(s => ({ ...s }))); };
  const save = async (status: "draft" | "published") => {
    if (status === 'published' && slides.some(slide => slide.title.trim().length < 3 || slide.title.trim().length > 80 || slide.body.trim().length < 15 || slide.body.trim().length > 280)) {
      setError('For each published slide, write a useful title (3–80 characters) and a short description (15–280 characters).');
      return;
    }
    setBusy(true); setError("");
    try { await api.post("/super-admin/product-updates", { id: editingId, title, slides, status }); await load(); reset(); }
    catch (e: any) { setError(e?.response?.data?.message || "Could not save update."); }
    finally { setBusy(false); }
  };
  const patchSlide = (i: number, key: keyof Slide, value: string) => setSlides(current => current.map((s, n) => n === i ? { ...s, [key]: value } : s));
  const uploadImage = async (index: number, file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Choose a PNG, JPEG, or WebP image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be 5 MB or smaller.'); return; }
    setUploadingSlide(index); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await api.post('/super-admin/product-updates/upload-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      patchSlide(index, 'imageUrl', response.data.data.imageUrl);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not upload image. Please try again.');
    } finally { setUploadingSlide(null); }
  };
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-semibold">What’s New</h2><p className="mt-1 text-sm text-muted-foreground">Publish product updates to the mobile app. Each user sees a published update once.</p></div>
    <section className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
      <div><h3 className="font-semibold">{editingId ? "Edit update" : "Create update"}</h3><p className="mt-1 text-sm text-muted-foreground">The update name is for your admin list. Users see each slide’s title, description, and image.</p></div>
      <label className="block text-sm">Admin-only update name<input className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} placeholder="October mobile release" /></label>
      {slides.map((slide, i) => <div key={i} className="rounded-lg border p-3 space-y-2">
        <div className="flex justify-between font-medium"><span>Slide {i + 1} <span className="font-normal text-muted-foreground">· shown to users</span></span>{slides.length > 1 && <button type="button" className="text-sm text-red-600" onClick={() => setSlides(s => s.filter((_, n) => n !== i))}>Remove</button>}</div>
        <label className="block text-sm">Short title<input maxLength={80} className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={slide.title} onChange={e => patchSlide(i, "title", e.target.value)} placeholder="e.g. Share files in chat" /></label>
        <label className="block text-sm">What changed, and why is it useful?<textarea maxLength={280} className="mt-1 w-full rounded-md border bg-background px-3 py-2" rows={3} value={slide.body} onChange={e => patchSlide(i, "body", e.target.value)} placeholder="e.g. Send images and documents directly in your conversations." /><span className="text-xs text-muted-foreground">Use 1–2 clear sentences. {slide.body.length}/280</span></label>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Slide image <span className="font-normal text-muted-foreground">(optional)</span></label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted has-[:disabled]:cursor-wait has-[:disabled]:opacity-60">
              {uploadingSlide === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadingSlide === i ? 'Uploading…' : slide.imageUrl ? 'Replace image' : 'Upload image'}
              <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingSlide !== null} onChange={e => { void uploadImage(i, e.target.files?.[0]); e.currentTarget.value = ''; }} />
            </label>
            {slide.imageUrl && <button type="button" className="inline-flex items-center gap-1 text-sm text-destructive" onClick={() => patchSlide(i, 'imageUrl', '')}><X className="h-4 w-4" />Remove</button>}
          </div>
          <p className="text-xs text-muted-foreground">Recommended: 1200 × 830 px (about 1.45:1) for the mobile modal image. PNG, JPEG, or WebP; 5 MB maximum. Other aspect ratios crop to fit.</p>
          {slide.imageUrl && <img src={slide.imageUrl} alt={`Preview for slide ${i + 1}`} className="h-48 w-full rounded-lg border object-cover" />}
          <input className="w-full rounded-md border bg-background px-3 py-2" value={slide.imageUrl || ""} onChange={e => patchSlide(i, "imageUrl", e.target.value)} placeholder="Or paste an image URL" />
        </div>
        <input className="w-full rounded-md border bg-background px-3 py-2" value={slide.ctaLabel || ""} onChange={e => patchSlide(i, "ctaLabel", e.target.value)} placeholder="Button label (optional)" />
      </div>)}
      {slides.length < 6 && <Button variant="outline" onClick={() => setSlides(s => [...s, blankSlide()])}>Add slide</Button>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button disabled={busy} variant="outline" onClick={() => save("draft")}>Save draft</Button><Button disabled={busy} onClick={() => save("published")}>Publish to mobile</Button>{editingId && <Button variant="ghost" onClick={reset}>Cancel</Button>}</div>
    </section>
    <section className="space-y-3"><h3 className="font-semibold">Published updates and drafts</h3>{items.length === 0 && <p className="text-sm text-muted-foreground">No updates yet.</p>}{items.map(item => <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"><div><div className="font-medium">{item.title}</div><div className="text-sm text-muted-foreground">{item.slides.length} slides · {item.status}</div></div><div className="flex gap-2"><Button variant="outline" onClick={() => edit(item)}>Edit</Button><Button variant="destructive" onClick={async () => { if (confirm(`Delete “${item.title}”?`)) { await api.delete(`/super-admin/product-updates/${item._id}`); await load(); } }}>Delete</Button></div></div>)}</section>
  </div>;
}
