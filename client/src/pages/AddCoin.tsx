import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCreateCoin } from "@/hooks/use-coins";
import { Shell } from "@/components/layout/Shell";
import { Upload, ChevronRight } from "lucide-react";

export default function AddCoin() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const createCoin = useCreateCoin();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Ottoman",
    photoUrl: "",
    metalType: "Silver",
    estimatedValue: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // In a real app, photoUrl would come from a file upload.
    // For MVP, we use the text input or a fallback if empty.
    const finalPhotoUrl = formData.photoUrl.trim() || "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80";

    createCoin.mutate({
      ...formData,
      photoUrl: finalPhotoUrl,
      estimatedValue: formData.estimatedValue ? Number(formData.estimatedValue) : 0,
    }, {
      onSuccess: () => {
        setLocation("/");
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isLoading) return null;
  if (!user) {
    window.location.href = "/api/login";
    return null;
  }

  return (
    <Shell>
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">Catalog a New Artifact</h1>
          <p className="text-muted-foreground">Add a piece to the Royal Museum's public gallery.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-card border border-border/50 p-6 md:p-10 rounded-3xl shadow-xl">
          
          {/* Image Input MVP style */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Artifact Image URL</label>
            <div className="flex gap-4 items-end">
               <div className="w-24 h-24 rounded-2xl bg-black/50 border border-dashed border-primary/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {formData.photoUrl ? (
                   <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).src=""} />
                ) : (
                  <Upload className="w-8 h-8 text-primary/30" />
                )}
              </div>
              <div className="flex-1">
                 <input 
                  type="url" 
                  name="photoUrl"
                  value={formData.photoUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/coin.jpg (Leave empty for default)" 
                  className="w-full bg-background border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Title / Name</label>
              <input 
                required
                type="text" 
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. 1922 King Fuad I Gold 500 Piastres" 
                className="w-full bg-background border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Category</label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-background border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 appearance-none"
              >
                <option>Ancient</option>
                <option>Medieval</option>
                <option>Ottoman</option>
                <option>Kingdom of Egypt</option>
                <option>Modern</option>
                <option>Error Coins</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Historical Description</label>
            <textarea 
              required
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Describe the condition, historical context, and unique features..." 
              className="w-full bg-background border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 resize-none custom-scrollbar"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Composition (Metal)</label>
              <input 
                type="text" 
                name="metalType"
                value={formData.metalType}
                onChange={handleChange}
                placeholder="e.g. 90% Gold, Copper" 
                className="w-full bg-background border border-border rounded-xl py-3 px-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Estimated Value ($)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input 
                  type="number" 
                  name="estimatedValue"
                  value={formData.estimatedValue}
                  onChange={handleChange}
                  placeholder="0" 
                  className="w-full bg-background border border-border rounded-xl py-3 pl-8 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border/30 flex justify-end">
            <button 
              type="button" 
              onClick={() => setLocation("/")}
              className="px-6 py-3 font-medium text-muted-foreground hover:text-foreground mr-4 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={createCoin.isPending}
              className="group flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all disabled:opacity-50"
            >
              {createCoin.isPending ? "Cataloging..." : "Add to Gallery"}
              {!createCoin.isPending && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>

        </form>
      </div>
    </Shell>
  );
}
