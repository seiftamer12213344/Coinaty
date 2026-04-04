import { useEffect, useRef, useState, useCallback } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { feature } from "topojson-client";
import { getHistoricalEntity, getEntityColor } from "@/data/historicalEntities";

const ENTITY_HEX: Record<string, string> = {
  ottoman:    "#3d2d5e",
  russian:    "#5c2233",
  british:    "#3b1f1f",
  french:     "#1a3060",
  spanish:    "#5c2820",
  austrian:   "#1f3a50",
  german:     "#2d3844",
  mughal:     "#5a3f10",
  chinese:    "#5a1a1a",
  japanese:   "#5a1a2a",
  portuguese: "#1f4a2a",
  persian:    "#3a1f5a",
  historical: "#2d3a4a",
  modern:     "#1a2a3a",
};

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function entityColor(countryName: string, year: number, alpha: number) {
  let key = "modern";
  try { key = getEntityColor(countryName, year); } catch {}
  return hexToRgba(ENTITY_HEX[key] ?? "#1a2a3a", alpha);
}

interface GlobeMapProps {
  selectedYear: number;
  selectedCountry: string | null;
  searching: boolean;
  onCountryClick: (countryName: string) => void;
  onHoverChange: (entityName: string | null) => void;
}

export default function GlobeMap({ selectedYear, selectedCountry, searching, onCountryClick, onHoverChange }: GlobeMapProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [countries, setCountries] = useState<any[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => r.json())
      .then(topo => {
        const geo = feature(topo as any, (topo as any).objects.countries) as any;
        setCountries(geo.features);
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setWidth(Math.floor(entries[0].contentRect.width));
    });
    ro.observe(containerRef.current);
    setWidth(containerRef.current.offsetWidth || 800);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ready || !globeRef.current) return;
    globeRef.current.pointOfView({ lat: 25, lng: 30, altitude: 1.6 }, 0);
    const controls = globeRef.current.controls() as any;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
  }, [ready]);

  const capColor = useCallback((d: any) => {
    const name: string = d?.properties?.name ?? "";
    if (name === selectedCountry) return "rgba(212,175,55,0.95)";
    if (name === hovered) return "rgba(212,175,55,0.55)";
    return entityColor(name, selectedYear, 0.88);
  }, [selectedYear, selectedCountry, hovered]);

  const sideColor = useCallback((d: any) => {
    const name: string = d?.properties?.name ?? "";
    if (name === selectedCountry) return "rgba(212,175,55,0.40)";
    return entityColor(name, selectedYear, 0.35);
  }, [selectedYear, selectedCountry]);

  const altitude = useCallback((d: any) => {
    const name: string = d?.properties?.name ?? "";
    return name === selectedCountry ? 0.022 : 0.005;
  }, [selectedCountry]);

  const label = useCallback((d: any) => {
    const name: string = d?.properties?.name ?? "";
    let entity = name;
    try { entity = getHistoricalEntity(name, selectedYear); } catch {}
    return `<div style="background:rgba(8,13,22,0.93);color:#fff;padding:5px 11px;border-radius:8px;border:1px solid rgba(212,175,55,0.38);font-size:12px;white-space:nowrap;pointer-events:none">
      <span style="color:#D4AF37;font-weight:700;font-family:serif">${entity}</span>
      <span style="color:rgba(255,255,255,0.45);margin-left:6px">· ${selectedYear}</span>
    </div>`;
  }, [selectedYear]);

  const handleHover = useCallback((polygon: any) => {
    const name: string = polygon?.properties?.name ?? null;
    setHovered(name);
    if (name) {
      let entity = name;
      try { entity = getHistoricalEntity(name, selectedYear); } catch {}
      onHoverChange(entity !== name ? entity : name);
    } else {
      onHoverChange(null);
    }
  }, [selectedYear, onHoverChange]);

  const handleClick = useCallback((polygon: any) => {
    const name: string = polygon?.properties?.name;
    if (!name) return;
    const controls = globeRef.current?.controls() as any;
    if (controls) controls.autoRotate = false;
    onCountryClick(name);
  }, [onCountryClick]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 480, background: "transparent", position: "relative" }}
    >
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Loading globe…</p>
          </div>
        </div>
      )}

      {ready && (
        <Globe
          ref={globeRef}
          width={width}
          height={480}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          polygonsData={countries}
          polygonAltitude={altitude}
          polygonCapColor={capColor}
          polygonSideColor={sideColor}
          polygonStrokeColor={() => "rgba(255,255,255,0.10)"}
          polygonLabel={label}
          onPolygonClick={handleClick}
          onPolygonHover={handleHover}
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor="rgba(80,140,210,0.75)"
          atmosphereAltitude={0.20}
          polygonsTransitionDuration={180}
        />
      )}

      {searching && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-black/80 rounded-2xl px-6 py-4 flex items-center gap-3 border border-primary/30 backdrop-blur-sm">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm font-medium">Searching numismatic records…</span>
          </div>
        </div>
      )}
    </div>
  );
}
