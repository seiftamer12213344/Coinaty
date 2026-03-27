import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCreateCoin } from "@/hooks/use-coins";
import { Shell } from "@/components/layout/Shell";
import {
  Search, Upload, ChevronRight, X, Loader2, Sparkles,
  PencilLine, ExternalLink, CheckCircle2, ArrowLeft
} from "lucide-react";

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
}

type Mode = "search" | "selected" | "manual";

const FIELD_CLASS = "w-full bg-background border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors";

function yearLabel(min?: number, max?: number) {
  if (!min && !max) return "";
  if (min === max || !max) return String(min);
  return `${min} – ${max}`;
}

export default function AddCoin() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const createCoin = useCreateCoin();

  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NumistaResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<NumistaDetail | null>(null);
  const [searchError, setSearchError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Ottoman",
    photoUrl: "",
    backPhotoUrl: "",
    metalType: "Silver",
    estimatedValue: "",
    numistaId: "",
  });

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearchError("");
      return;
    }
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
  }, [query]);

  const handleSelectCoin = async (coin: NumistaResult) => {
    setIsFetchingDetail(true);
    setResults([]);
    try {
      const res = await fetch(`/api/numista/types/${coin.id}`, { credentials: "include" });
      const detail: NumistaDetail = res.ok ? await res.json() : coin;
      setSelectedMeta(detail);

      // Infer category from issuer/year
      let category = "Modern";
      const issuer = detail.issuer?.name?.toLowerCase() || "";
      const year = detail.min_year || 0;
      if (year < 500) category = "Ancient";
      else if (year < 1300) category = "Medieval";
      else if (issuer.includes("ottoman") || (year >= 1300 && year < 1800)) category = "Ottoman";
      else if (issuer.includes("egypt") && year >= 1922 && year < 1953) category = "Kingdom of Egypt";

      // Build a rich description from metadata
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
        metalType: detail.composition?.text?.match(/gold/i) ? "Gold"
          : detail.composition?.text?.match(/silver/i) ? "Silver"
          : detail.composition?.text?.match(/bronze|copper/i) ? "Bronze/Copper"
          : "Unknown",
        estimatedValue: "",
        numistaId: detail.id,
      });
      setMode("selected");
    } catch {
      // Still go to form with whatever we have
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
      estimatedValue: formData.estimatedValue ? Number(formData.estimatedValue) : 0,
    }, {
      onSuccess: () => setLocation("/"),
    });
  };

  const resetToSearch = () => {
    setMode("search");
    setQuery("");
    setResults([]);
    setSelectedMeta(null);
    setSearchError("");
    setFormData({ title: "", description: "", category: "Ottoman", photoUrl: "", backPhotoUrl: "", metalType: "Silver", estimatedValue: "", numistaId: "" });
  };

  if (authLoading) return null;
  if (!user) { window.location.href = "/api/login"; return null; }

  return (
    <Shell>
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">Catalog a New Artifact</h1>
          <p className="text-muted-foreground">Add a piece to the Royal Museum's public gallery.</p>
        </div>

        {/* ── SEARCH MODE ──────────────────────────────────────── */}
        {mode === "search" && (
          <div className="space-y-6">
            <div className="bg-card border border-border/50 rounded-3xl p-6 md:p-10 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <h2 className="font-serif text-lg font-semibold text-foreground">AI-Powered Search</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Global Database</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Type a coin name, year, issuer, or ruler. Select a result to auto-fill all known details.
              </p>

              {/* Search Input */}
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

              {/* Loading Spinner */}
              {isSearching && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Searching global numismatic database...
                </div>
              )}

              {/* Fetching Detail */}
              {isFetchingDetail && (
                <div className="flex items-center justify-center gap-3 mt-8 py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">Fetching coin details...</span>
                </div>
              )}

              {/* Error */}
              {searchError && !isSearching && (
                <p className="text-sm text-muted-foreground mt-4 italic">{searchError}</p>
              )}

              {/* Results List */}
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
                          <img
                            src={coin.obverse.thumbnail}
                            alt={coin.title}
                            className="w-full h-full object-cover"
                            onError={e => (e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-muted-foreground text-xs">N/A</div>')}
                          />
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

            {/* Manual Entry Option */}
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

        {/* ── SELECTED / MANUAL FORM ────────────────────────────── */}
        {(mode === "selected" || mode === "manual") && (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Header bar */}
            <div className="flex items-center justify-between bg-card border border-border/50 rounded-2xl px-5 py-3">
              <button type="button" onClick={resetToSearch} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Search
              </button>
              {mode === "selected" && selectedMeta && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-primary">Auto-filled from Numista N#{selectedMeta.id}</span>
                  <a
                    href={`https://en.numista.com/catalogue/pieces${selectedMeta.id}.html`}
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

              {/* Images — Obverse + Reverse */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Coin Photos
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Obverse (Front) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">Obverse</span>
                      <span className="text-xs text-muted-foreground">Front face · Required</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-32 rounded-2xl bg-black/20 dark:bg-black/50 border border-dashed border-primary/50 flex items-center justify-center overflow-hidden">
                        {formData.photoUrl ? (
                          <img src={formData.photoUrl} alt="Obverse preview" className="w-full h-full object-contain p-2"
                            onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-primary/30">
                            <Upload className="w-7 h-7" />
                            <span className="text-xs">Front Face</span>
                          </div>
                        )}
                      </div>
                      <input type="url" name="photoUrl" value={formData.photoUrl} onChange={handleChange}
                        data-testid="input-photo-front"
                        placeholder="https://example.com/front.jpg"
                        className={FIELD_CLASS}
                      />
                      {mode === "selected" && formData.photoUrl && (
                        <p className="text-xs text-primary flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Auto-filled from Numista
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Reverse (Back) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5">Reverse</span>
                      <span className="text-xs text-muted-foreground">Back face · Optional</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-32 rounded-2xl bg-black/20 dark:bg-black/50 border border-dashed border-border/50 flex items-center justify-center overflow-hidden">
                        {formData.backPhotoUrl ? (
                          <img src={formData.backPhotoUrl} alt="Reverse preview" className="w-full h-full object-contain p-2"
                            onError={e => ((e.target as HTMLImageElement).style.display = "none")} />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-muted-foreground/30">
                            <Upload className="w-7 h-7" />
                            <span className="text-xs">Back Face</span>
                          </div>
                        )}
                      </div>
                      <input type="url" name="backPhotoUrl" value={formData.backPhotoUrl} onChange={handleChange}
                        data-testid="input-photo-back"
                        placeholder="https://example.com/back.jpg"
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    Title / Name
                    {mode === "selected" && formData.title && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </label>
                  <input required type="text" name="title" value={formData.title} onChange={handleChange}
                    placeholder="e.g. 1922 King Fuad I Gold 500 Piastres"
                    className={FIELD_CLASS}
                  />
                </div>

                {/* Category */}
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

              {/* Metal + Estimated Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    Composition (Metal)
                    {mode === "selected" && formData.metalType && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </label>
                  <input type="text" name="metalType" value={formData.metalType} onChange={handleChange}
                    placeholder="e.g. 90% Gold, Copper"
                    className={FIELD_CLASS}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Estimated Value ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <input type="number" name="estimatedValue" value={formData.estimatedValue} onChange={handleChange}
                      placeholder="0"
                      className={`${FIELD_CLASS} pl-8`}
                    />
                  </div>
                </div>
              </div>

              {/* Description — manual only; auto-fill shows it read-only with edit option */}
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
                  className={`${FIELD_CLASS} resize-none custom-scrollbar`}
                />
              </div>

              {/* Numista ID (hidden but shown for transparency) */}
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

              {/* Actions */}
              <div className="pt-4 border-t border-border/30 flex justify-end gap-3">
                <button type="button" onClick={resetToSearch}
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
    </Shell>
  );
}
