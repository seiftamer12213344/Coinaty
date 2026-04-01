import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCreateCoin } from "@/hooks/use-coins";
import { Shell } from "@/components/layout/Shell";
import {
  Search, Upload, ChevronRight, X, Loader2, Sparkles,
  PencilLine, ExternalLink, CheckCircle2, ArrowLeft, ImagePlus, Link as LinkIcon,
  Map, Globe, Calendar, Coins
} from "lucide-react";
import GlobeMap from "@/components/GlobeMap";
import { getHistoricalEntity } from "@/data/historicalEntities";


// ── Interfaces ──────────────────────────────────────────────────────────────
interface NumistaResult {
  id: string;
  title: string;
  issuer?: { name: string };
  min_year?: number;
  max_year?: number;
  obverse?: { thumbnail?: string };
}

interface NumistaDetail extends NumistaResult {
  composition?: { text?: string };
  weight_g?: number;
  diameter_mm?: number;
  ruler?: { name: string };
  reverse?: { thumbnail?: string; picture?: string };
}

type Mode = "discover" | "search" | "selected" | "manual";

const FIELD_CLASS = "w-full bg-background border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors";

// ── ImageUploadField ─────────────────────────────────────────────────────────
interface ImageUploadFieldProps {
  label: string;
  badge: string;
  badgeVariant: "primary" | "muted";
  hint: string;
  value: string;
  onChange: (url: string) => void;
  autoFilled?: boolean;
  testId: string;
}

function ImageUploadField({ label, badge, badgeVariant, hint, value, onChange, autoFilled, testId }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { setUploadError("Please select an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { setUploadError("File must be under 8 MB."); return; }
    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      onChange(url);
    } catch {
      setUploadError("Upload failed. Try again or paste a URL.");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const isPrimary = badgeVariant === "primary";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-widest rounded-full px-2 py-0.5 border ${
          isPrimary ? "text-primary bg-primary/10 border-primary/20" : "text-muted-foreground bg-muted border-border"
        }`}>{badge}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <div
        data-testid={`${testId}-dropzone`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        className={`relative h-36 rounded-2xl border-2 border-dashed cursor-pointer transition-all overflow-hidden flex items-center justify-center ${
          dragOver
            ? "border-primary bg-primary/10 scale-[1.01]"
            : value
              ? "border-border/40 bg-black/20 dark:bg-black/40"
              : isPrimary
                ? "border-primary/40 bg-primary/5 hover:border-primary/70 hover:bg-primary/10"
                : "border-border/50 bg-black/10 dark:bg-black/20 hover:border-border"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-primary">
            <Loader2 className="w-7 h-7 animate-spin" />
            <span className="text-xs font-medium">Uploading…</span>
          </div>
        ) : value ? (
          <>
            <img src={value} alt={label} className="w-full h-full object-contain p-2"
              onError={e => ((e.target as HTMLImageElement).style.opacity = "0.3")} />
            <button type="button" onClick={e => { e.stopPropagation(); onChange(""); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className={`flex flex-col items-center gap-1.5 ${isPrimary ? "text-primary/40" : "text-muted-foreground/30"}`}>
            <ImagePlus className="w-8 h-8" />
            <span className="text-xs font-medium">{dragOver ? "Drop to upload" : "Click or drag photo here"}</span>
          </div>
        )}
      </div>
      <input ref={fileRef} data-testid={testId} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
      {autoFilled && value && !uploadError && (
        <p className="text-xs text-primary flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Auto-filled from Numista
        </p>
      )}
      <button type="button" onClick={() => setShowUrlInput(v => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <LinkIcon className="w-3 h-3" />
        {showUrlInput ? "Hide URL input" : "Or paste a URL instead"}
      </button>
      {showUrlInput && (
        <input type="url" value={value} onChange={e => onChange(e.target.value)}
          placeholder="https://example.com/coin.jpg" className={FIELD_CLASS + " text-sm"} />
      )}
    </div>
  );
}

function yearLabel(min?: number, max?: number) {
  if (!min && !max) return "";
  if (min === max || !max) return String(min);
  return `${min} – ${max}`;
}


// ── Main Component ────────────────────────────────────────────────────────────
export default function AddCoin() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const createCoin = useCreateCoin();

  const [mode, setMode] = useState<Mode>("discover");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NumistaResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<NumistaDetail | null>(null);
  const [searchError, setSearchError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Discover mode state
  const [selectedYear, setSelectedYear] = useState(1850);
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [selectedCountryKey, setSelectedCountryKey] = useState<string | null>(null);
  const [mapResults, setMapResults] = useState<NumistaResult[]>([]);
  const [mapSearching, setMapSearching] = useState(false);
  const [mapQuery, setMapQuery] = useState("");
  const [mapError, setMapError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Ottoman",
    photoUrl: "",
    backPhotoUrl: "",
    metalType: "Silver",
    numistaId: "",
  });

  // ── Debounced text search (used in search mode) ─────────────────────────────
  useEffect(() => {
    if (mode !== "search") return;
    if (query.trim().length < 2) { setResults([]); setSearchError(""); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const res = await fetch(`/api/numista/search?q=${encodeURIComponent(query)}`, { credentials: "include" });
        if (!res.ok) throw new Error("Search failed");
        const data: NumistaResult[] = await res.json();
        setResults(data);
        if (data.length === 0) setSearchError("No coins found. Try different keywords or enter manually.");
      } catch {
        setSearchError("Search unavailable. Please enter details manually.");
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, mode]);

  // ── Globe click handler ─────────────────────────────────────────────────────
  const handleMapClick = useCallback(async (countryName: string) => {
    let entity = countryName;
    try { entity = getHistoricalEntity(countryName, selectedYear); } catch {}

    setSelectedCountryKey(countryName);
    setMapQuery(`Coins of "${entity}" minted around ${selectedYear}`);
    setMapResults([]);
    setMapError("");
    setMapSearching(true);

    try {
      const res = await fetch(`/api/numista/search?q=${encodeURIComponent(entity)}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data: NumistaResult[] = await res.json();

      // Filter to coins whose year range overlaps the selected year (±30 years tolerance)
      const filtered = data.filter(c => {
        if (!c.min_year && !c.max_year) return false;
        const lo = c.min_year ?? c.max_year!;
        const hi = c.max_year ?? c.min_year!;
        return lo <= selectedYear + 30 && hi >= selectedYear - 30;
      });

      setMapResults(filtered);
      if (filtered.length === 0) setMapError(`No coins found for "${entity}" around ${selectedYear}. Try a different year.`);
    } catch {
      setMapError("Search unavailable. Check your connection.");
    } finally {
      setMapSearching(false);
    }
  }, [selectedYear]);

  // ── Select coin from any result list ───────────────────────────────────────
  const handleSelectCoin = async (coin: NumistaResult) => {
    setIsFetchingDetail(true);
    setResults([]);
    setMapResults([]);
    try {
      const res = await fetch(`/api/numista/types/${coin.id}`, { credentials: "include" });
      const detail: NumistaDetail = res.ok ? await res.json() : coin;
      setSelectedMeta(detail);

      let category = "Modern";
      const issuer = detail.issuer?.name?.toLowerCase() || "";
      const year = detail.min_year || 0;
      if (year < 500) category = "Ancient";
      else if (year < 1300) category = "Medieval";
      else if (issuer.includes("ottoman") || (year >= 1300 && year < 1800)) category = "Ottoman";
      else if (issuer.includes("egypt") && year >= 1922 && year < 1953) category = "Kingdom of Egypt";

      const parts: string[] = [];
      if (detail.issuer?.name) parts.push(`Issued by: ${detail.issuer.name}.`);
      if (detail.ruler?.name) parts.push(`Ruler: ${detail.ruler.name}.`);
      if (yearLabel(detail.min_year, detail.max_year)) parts.push(`Year(s): ${yearLabel(detail.min_year, detail.max_year)}.`);
      if (detail.composition?.text) parts.push(`Composition: ${detail.composition.text}.`);
      if (detail.weight_g) parts.push(`Weight: ${detail.weight_g}g.`);
      if (detail.diameter_mm) parts.push(`Diameter: ${detail.diameter_mm}mm.`);

      setFormData({
        title: detail.title,
        description: parts.join(" "),
        category,
        photoUrl: detail.obverse?.thumbnail || "",
        backPhotoUrl: detail.reverse?.thumbnail || "",
        metalType: detail.composition?.text?.match(/gold/i) ? "Gold"
          : detail.composition?.text?.match(/silver/i) ? "Silver"
          : detail.composition?.text?.match(/bronze|copper/i) ? "Bronze/Copper"
          : "Unknown",
        numistaId: detail.id,
      });
      setMode("selected");
    } catch {
      setFormData(prev => ({ ...prev, title: coin.title, numistaId: coin.id }));
      setMode("selected");
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const finalPhotoUrl = formData.photoUrl.trim() || "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80";
    createCoin.mutate({
      ...formData,
      photoUrl: finalPhotoUrl,
      backPhotoUrl: formData.backPhotoUrl.trim() || undefined,
    }, {
      onSuccess: () => setLocation("/"),
    });
  };

  const resetToDiscover = () => {
    setMode("discover");
    setQuery("");
    setResults([]);
    setSelectedMeta(null);
    setSearchError("");
    setMapResults([]);
    setMapQuery("");
    setMapError("");
    setSelectedCountryKey(null);
    setFormData({ title: "", description: "", category: "Ottoman", photoUrl: "", backPhotoUrl: "", metalType: "Silver", numistaId: "" });
  };

  if (authLoading) return null;
  if (!user) { window.location.href = "/auth"; return null; }

  // ── Era label ───────────────────────────────────────────────────────────────
  const ERA_MARKERS = [
    { year: 1700, label: "1700" },
    { year: 1800, label: "1800" },
    { year: 1900, label: "1900" },
    { year: 1950, label: "1950" },
    { year: 2000, label: "2000" },
    { year: 2026, label: "2026" },
  ];

  const getEraName = (y: number) => {
    if (y < 1750) return "Early Modern";
    if (y < 1800) return "Age of Revolutions";
    if (y < 1850) return "Napoleonic Era";
    if (y < 1900) return "Industrial Age";
    if (y < 1920) return "Belle Époque / WWI";
    if (y < 1945) return "Interwar / WWII";
    if (y < 1991) return "Cold War Era";
    return "Modern Era";
  };

  return (
    <Shell>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-serif font-bold text-primary mb-1">Catalog a New Artifact</h1>
          <p className="text-muted-foreground text-sm">Explore history on the map, or search the global database directly.</p>
        </div>

        {/* Mode Tabs (discover / search) — only shown in top-level modes */}
        {(mode === "discover" || mode === "search") && (
          <div className="flex gap-2 mb-6 bg-card border border-border/50 p-1.5 rounded-2xl w-fit mx-auto shadow">
            <button
              data-testid="tab-discover"
              onClick={() => setMode("discover")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                mode === "discover"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Globe className="w-4 h-4" />
              Discover by Map
            </button>
            <button
              data-testid="tab-search"
              onClick={() => setMode("search")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                mode === "search"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Search className="w-4 h-4" />
              Search Database
            </button>
          </div>
        )}

        {/* ══ DISCOVER MODE ══════════════════════════════════════════════════════ */}
        {mode === "discover" && (
          <div className="space-y-4">

            {/* Timeline Slider Card */}
            <div className="bg-card border border-border/50 rounded-3xl p-5 md:p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif font-semibold text-foreground leading-tight">Timeline</h2>
                  <p className="text-xs text-muted-foreground">Drag to travel through history</p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-4xl font-serif font-bold text-primary tabular-nums">{selectedYear}</span>
                  <p className="text-xs text-muted-foreground">{getEraName(selectedYear)}</p>
                </div>
              </div>

              {/* Custom slider */}
              <div className="relative mt-2">
                <input
                  data-testid="input-year-slider"
                  type="range"
                  min={1700}
                  max={2026}
                  value={selectedYear}
                  onChange={e => {
                    setSelectedYear(Number(e.target.value));
                    setSelectedCountryKey(null);
                    setMapResults([]);
                    setMapQuery("");
                    setMapError("");
                  }}
                  className="w-full h-2 appearance-none cursor-pointer rounded-full outline-none"
                  style={{
                    background: `linear-gradient(to right, #D4AF37 0%, #D4AF37 ${((selectedYear - 1700) / 326) * 100}%, #2a3a4a ${((selectedYear - 1700) / 326) * 100}%, #2a3a4a 100%)`,
                  }}
                />
                {/* Era markers — absolutely positioned to match actual slider scale */}
                <div className="relative mt-2 h-5">
                  {ERA_MARKERS.map(m => {
                    const pct = ((m.year - 1700) / (2026 - 1700)) * 100;
                    return (
                      <button
                        key={m.year}
                        onClick={() => { setSelectedYear(m.year); setSelectedCountryKey(null); setMapResults([]); setMapQuery(""); }}
                        className={`absolute -translate-x-1/2 text-xs transition-colors hover:text-primary ${selectedYear === m.year ? "text-primary font-bold" : "text-muted-foreground/60"}`}
                        style={{ left: `${pct}%` }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* World Map Card */}
            <div className="bg-card border border-border/50 rounded-3xl overflow-hidden shadow-xl relative">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border/30">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Map className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-serif font-semibold text-foreground">
                    The World in <span className="text-primary">{selectedYear}</span>
                  </h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {hoveredEntity
                      ? <><span className="text-primary font-medium">{hoveredEntity}</span> — click to find coins</>
                      : "Hover a territory to see its historical name · Click to discover coins"}
                  </p>
                </div>
                {selectedCountryKey && (
                  <button
                    onClick={() => { setSelectedCountryKey(null); setMapResults([]); setMapQuery(""); setMapError(""); }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>

              {/* 3D Globe */}
              <div className="relative overflow-hidden" style={{ background: "#050a12" }}>
                <GlobeMap
                  selectedYear={selectedYear}
                  selectedCountry={selectedCountryKey}
                  searching={mapSearching}
                  onCountryClick={handleMapClick}
                  onHoverChange={entity => setHoveredEntity(entity)}
                />
              </div>
            </div>

            {/* Results Panel */}
            {(mapQuery || mapError) && (
              <div className="bg-card border border-border/50 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Coins className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-serif font-semibold text-foreground">Discovery Results</h2>
                    {mapQuery && <p className="text-xs text-primary mt-0.5">{mapQuery}</p>}
                  </div>
                  {mapResults.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                      {mapResults.length} coin{mapResults.length !== 1 ? "s" : ""} found
                    </span>
                  )}
                </div>

                {mapError && (
                  <p className="text-sm text-muted-foreground italic">{mapError}</p>
                )}

                {mapResults.length > 0 && (
                  <div className="space-y-2">
                    {mapResults.map(coin => (
                      <button
                        key={coin.id}
                        data-testid={`card-map-result-${coin.id}`}
                        onClick={() => handleSelectCoin(coin)}
                        className="w-full flex items-center gap-4 p-3 bg-background rounded-xl border border-border hover:border-primary/60 hover:bg-primary/5 transition-all text-left group"
                      >
                        <div className="w-14 h-14 rounded-xl bg-muted border border-border overflow-hidden flex-shrink-0">
                          {coin.obverse?.thumbnail ? (
                            <img src={coin.obverse.thumbnail} alt={coin.title} className="w-full h-full object-cover"
                              onError={e => (e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-serif">?</div>')} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-serif">
                              {coin.title[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm">{coin.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {coin.issuer?.name && <span>{coin.issuer.name}</span>}
                            {coin.min_year && <span className="ml-2 text-primary/70">{yearLabel(coin.min_year, coin.max_year)}</span>}
                            <span className="ml-2 text-muted-foreground/50">N#{coin.id}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors hidden sm:block">Add to vault</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {isFetchingDetail && (
                  <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-muted-foreground text-sm">Fetching coin details…</span>
                  </div>
                )}
              </div>
            )}

            {/* Help text when nothing is selected */}
            {!mapQuery && !mapError && (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">
                  Can't find what you're looking for?{" "}
                  <button onClick={() => setMode("search")} className="text-primary hover:underline font-medium">
                    Search the database directly
                  </button>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══ SEARCH MODE ════════════════════════════════════════════════════════ */}
        {mode === "search" && (
          <div className="space-y-6">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-10 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-serif text-lg font-semibold text-foreground">Database Search</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Global</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Type a coin name, year, issuer, or ruler. Select a result to auto-fill all known details.
              </p>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  data-testid="input-numista-search"
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="e.g. Egypt 1917 5 Piastres, Alexander Tetradrachm..."
                  autoFocus
                  className="w-full bg-background border border-border rounded-xl py-4 pl-12 pr-12 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors"
                />
                {query && (
                  <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isSearching && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Searching global numismatic database...
                </div>
              )}

              {isFetchingDetail && (
                <div className="flex items-center justify-center gap-3 mt-8 py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">Fetching coin details...</span>
                </div>
              )}

              {searchError && !isSearching && (
                <p className="text-sm text-muted-foreground mt-4 italic">{searchError}</p>
              )}

              {results.length > 0 && !isFetchingDetail && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                    {results.length} result{results.length !== 1 ? "s" : ""} found
                  </p>
                  {results.map(coin => (
                    <button
                      key={coin.id}
                      data-testid={`card-numista-result-${coin.id}`}
                      onClick={() => handleSelectCoin(coin)}
                      className="w-full flex items-center gap-4 p-4 bg-background rounded-xl border border-border hover:border-primary/60 hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="w-14 h-14 rounded-xl bg-muted border border-border overflow-hidden flex-shrink-0">
                        {coin.obverse?.thumbnail ? (
                          <img src={coin.obverse.thumbnail} alt={coin.title} className="w-full h-full object-cover"
                            onError={e => (e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-muted-foreground text-xs">N/A</div>')} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-serif">
                            {coin.title[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{coin.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {coin.issuer?.name && <span>{coin.issuer.name}</span>}
                          {coin.min_year && <span className="ml-2 text-primary/70">{yearLabel(coin.min_year, coin.max_year)}</span>}
                          <span className="ml-2 text-xs text-muted-foreground/60">N#{coin.id}</span>
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Can't find your coin?</p>
              <button
                data-testid="button-enter-manually"
                onClick={() => setMode("manual")}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-border hover:border-primary/50 bg-card hover:bg-muted rounded-xl text-sm font-medium transition-all"
              >
                <PencilLine className="w-4 h-4" />
                Enter Manually
              </button>
            </div>
          </div>
        )}

        {/* ══ SELECTED / MANUAL FORM ═════════════════════════════════════════════ */}
        {(mode === "selected" || mode === "manual") && (
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="flex items-center justify-between bg-card border border-border/50 rounded-2xl px-5 py-3">
              <button type="button" onClick={resetToDiscover} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Discovery
              </button>
              {mode === "selected" && selectedMeta && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-primary">Auto-filled from Numista N#{selectedMeta.id}</span>
                  <a href={`https://en.numista.com/catalogue/pieces${selectedMeta.id}.html`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {mode === "manual" && (
                <span className="text-xs text-muted-foreground">Manual entry mode</span>
              )}
            </div>

            <div className="bg-card border border-border/50 p-6 md:p-10 rounded-3xl shadow-xl space-y-8">

              {/* Images */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Coin Photos
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ImageUploadField
                    label="Obverse" badge="Obverse" badgeVariant="primary" hint="Front face · Required"
                    value={formData.photoUrl} onChange={url => setFormData(prev => ({ ...prev, photoUrl: url }))}
                    autoFilled={mode === "selected"} testId="input-photo-front"
                  />
                  <ImageUploadField
                    label="Reverse" badge="Reverse" badgeVariant="muted" hint="Back face · Optional"
                    value={formData.backPhotoUrl} onChange={url => setFormData(prev => ({ ...prev, backPhotoUrl: url }))}
                    testId="input-photo-back"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    Title / Name
                    {mode === "selected" && formData.title && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </label>
                  <input required type="text" name="title" value={formData.title} onChange={handleChange}
                    placeholder="e.g. 1922 King Fuad I Gold 500 Piastres" className={FIELD_CLASS} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    Category
                    {mode === "selected" && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </label>
                  <select name="category" value={formData.category} onChange={handleChange} className={`${FIELD_CLASS} appearance-none`}>
                    <option>Ancient</option>
                    <option>Medieval</option>
                    <option>Ottoman</option>
                    <option>Kingdom of Egypt</option>
                    <option>Modern</option>
                    <option>Error Coins</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    Composition (Metal)
                    {mode === "selected" && formData.metalType && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </label>
                  <input type="text" name="metalType" value={formData.metalType} onChange={handleChange}
                    placeholder="e.g. 90% Gold, Copper" className={FIELD_CLASS} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {mode === "selected" ? "Personal Notes" : "Historical Description"}
                    {mode === "selected" && <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Your entry</span>}
                  </span>
                </label>
                {mode === "selected" && (
                  <div className="text-xs text-muted-foreground bg-muted/50 dark:bg-black/20 border border-border/40 rounded-xl p-3 mb-2 leading-relaxed">
                    {formData.description}
                  </div>
                )}
                <textarea
                  required={mode === "manual"}
                  name="description"
                  value={mode === "selected" ? "" : formData.description}
                  onChange={e => {
                    if (mode === "selected") {
                      setFormData(prev => ({ ...prev, description: prev.description + (prev.description ? " " : "") + e.target.value }));
                    } else {
                      handleChange(e);
                    }
                  }}
                  rows={3}
                  placeholder={mode === "selected"
                    ? "Add your personal notes, condition grade, provenance..."
                    : "Describe the condition, historical context, and unique features..."}
                  className={`${FIELD_CLASS} resize-none`}
                />
              </div>

              {formData.numistaId && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">Numista reference saved:</span>
                  <span className="font-mono text-primary font-semibold">N#{formData.numistaId}</span>
                  <a href={`https://en.numista.com/catalogue/pieces${formData.numistaId}.html`}
                    target="_blank" rel="noreferrer"
                    className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Official Page <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="pt-4 border-t border-border/30 flex justify-end gap-3">
                <button type="button" onClick={resetToDiscover}
                  className="px-6 py-3 font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button
                  data-testid="button-submit-coin"
                  type="submit"
                  disabled={createCoin.isPending}
                  className="group flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all disabled:opacity-50"
                >
                  {createCoin.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                  ) : (
                    <>Add to Gallery <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Slider track styling */}
      <style>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #D4AF37;
          cursor: pointer;
          border: 3px solid #0a1929;
          box-shadow: 0 0 0 2px #D4AF37, 0 2px 8px rgba(212,175,55,0.4);
          transition: transform 0.1s, box-shadow 0.1s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 0 0 3px #D4AF37, 0 4px 16px rgba(212,175,55,0.6);
        }
        input[type="range"]::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #D4AF37;
          cursor: pointer;
          border: 3px solid #0a1929;
          box-shadow: 0 0 0 2px #D4AF37;
        }
      `}</style>
    </Shell>
  );
}
