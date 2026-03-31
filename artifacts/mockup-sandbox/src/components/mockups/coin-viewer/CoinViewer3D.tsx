import { Suspense, useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";

// ── Sample coin images (public domain, Numista) ──────────────────────────────
const SAMPLE_FRONT = "https://en.numista.com/catalogue/photos/egypte/69a40bcf01ca46.04276128-180.jpg";
const SAMPLE_BACK  = "https://en.numista.com/catalogue/photos/egypte/69a40bd1e055e9.15149207-180.jpg";

// ── Reeded edge texture (generated on a canvas) ───────────────────────────────
function makeReedTexture(metalColor: string) {
  const w = 512, h = 64;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Base metal gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0,   lighten(metalColor, 40));
  grad.addColorStop(0.5, metalColor);
  grad.addColorStop(1,   darken(metalColor, 40));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Vertical reeds (ridges)
  const reedCount = 120;
  const reedW = w / reedCount;
  for (let i = 0; i < reedCount; i++) {
    const x = i * reedW;
    const ridge = ctx.createLinearGradient(x, 0, x + reedW, 0);
    ridge.addColorStop(0,    "rgba(255,255,255,0.25)");
    ridge.addColorStop(0.35, "rgba(255,255,255,0.08)");
    ridge.addColorStop(0.65, "rgba(0,0,0,0.10)");
    ridge.addColorStop(1,    "rgba(0,0,0,0.22)");
    ctx.fillStyle = ridge;
    ctx.fillRect(x, 0, reedW, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

// ── Colour helpers ────────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return { r, g, b };
}
function lighten(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
}
function darken(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`;
}

// ── The Coin Mesh ─────────────────────────────────────────────────────────────
interface CoinMeshProps {
  frontImage: string;
  backImage: string;
  metalColor: string;
  autoRotate: boolean;
}

function CoinMesh({ frontImage, backImage, metalColor, autoRotate }: CoinMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [frontTex, backTex] = useLoader(TextureLoader, [frontImage, backImage]);

  // Make textures look crisp
  [frontTex, backTex].forEach(t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 16;
  });

  const reedTex = useMemo(() => makeReedTexture(metalColor), [metalColor]);

  // Three materials: [top cap = front, bottom cap = back, side = reeded edge]
  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ map: frontTex,  roughness: 0.25, metalness: 0.7 }),
    new THREE.MeshStandardMaterial({ map: backTex,   roughness: 0.25, metalness: 0.7 }),
    new THREE.MeshStandardMaterial({
      map: reedTex,
      color: metalColor,
      roughness: 0.35,
      metalness: 0.85,
    }),
  ], [frontTex, backTex, reedTex, metalColor]);

  // CylinderGeometry groups: 0=top, 1=bottom, 2=side
  // We need to swap so top=front, bottom=back
  const geometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(1, 1, 0.1, 64, 1, false);
    // Remap so group 0 = top face (front), group 1 = bottom face (back), group 2 = side
    // Three.js CylinderGeometry default: 0=side, 1=top, 2=bottom
    // We need group 0→front(top), 1→back(bottom), 2→side
    // Re-assign by remapping:
    for (let i = 0; i < g.groups.length; i++) {
      const grp = g.groups[i];
      if (grp.materialIndex === 0) grp.materialIndex = 2; // side → 2
      else if (grp.materialIndex === 1) grp.materialIndex = 0; // top → 0
      else if (grp.materialIndex === 2) grp.materialIndex = 1; // bottom → 1
    }
    return g;
  }, []);

  useFrame((_, delta) => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  // Rotate so the face looks at camera (Y becomes Z)
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={materials}
      rotation={[Math.PI / 2, 0, 0]}
      castShadow
    />
  );
}

// ── Loading spinner (shown via Suspense) ──────────────────────────────────────
function Loader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0f1117]/90 rounded-2xl">
      <div className="w-12 h-12 rounded-full border-4 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
      <span className="text-[#D4AF37] text-sm font-medium tracking-widest uppercase">Loading</span>
    </div>
  );
}

// ── Coin Scene (Three.js internals) ──────────────────────────────────────────
interface SceneProps { frontImage: string; backImage: string; metalColor: string; autoRotate: boolean; }

function CoinScene({ frontImage, backImage, metalColor, autoRotate }: SceneProps) {
  return (
    <>
      <Environment preset="studio" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
      <pointLight position={[-4, 3, 4]} intensity={0.6} color="#fff8e7" />

      <Suspense fallback={null}>
        <CoinMesh
          frontImage={frontImage}
          backImage={backImage}
          metalColor={metalColor}
          autoRotate={autoRotate}
        />
        <ContactShadows
          position={[0, -0.65, 0]}
          opacity={0.55}
          scale={4}
          blur={2.5}
          far={1}
          color="#1a1a1a"
        />
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={5}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface CoinViewer3DProps {
  frontImage?: string;
  backImage?: string;
  metalColor?: string;
  title?: string;
  subtitle?: string;
  year?: string;
  metal?: string;
}

// ── Main exported component ───────────────────────────────────────────────────
export function CoinViewer3D({
  frontImage  = SAMPLE_FRONT,
  backImage   = SAMPLE_BACK,
  metalColor  = "#BFC5C3",   // Nordic Mint — elevated neutral
  title       = "2½ Milliemes — Fuad I",
  subtitle    = "Kingdom of Egypt",
  year        = "1933",
  metal       = "Copper-Nickel",
}: CoinViewer3DProps) {
  const [autoRotate, setAutoRotate] = useState(true);

  return (
    <div
      className="relative w-full h-full flex flex-col"
      style={{ background: "linear-gradient(160deg, #12151a 0%, #1b2028 50%, #0e1118 100%)" }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]/70 font-semibold mb-1">
          {subtitle}
        </p>
        <h2
          className="text-2xl font-semibold text-white"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h2>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-sm text-white/40">{year}</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span className="text-sm text-white/40">{metal}</span>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="relative flex-1 mx-4 my-3 rounded-2xl overflow-hidden"
           style={{ background: "radial-gradient(ellipse at 50% 40%, #1e2430 0%, #0c0f14 100%)" }}>
        <Canvas
          camera={{ position: [0, 0, 3.5], fov: 45 }}
          shadows
          style={{ width: "100%", height: "100%" }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          onPointerDown={() => setAutoRotate(false)}
        >
          <Suspense fallback={null}>
            <CoinScene
              frontImage={frontImage}
              backImage={backImage}
              metalColor={metalColor}
              autoRotate={autoRotate}
            />
          </Suspense>
        </Canvas>

        {/* Subtleedge vignette */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl"
             style={{ boxShadow: "inset 0 0 60px 20px rgba(0,0,0,0.5)" }} />

        {/* Interaction hint */}
        {autoRotate && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 pointer-events-none">
            <div className="w-3 h-3 rounded-full border border-[#D4AF37]/50 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#D4AF37]" />
            </div>
            <span className="text-[10px] text-white/50 tracking-widest uppercase">Drag to inspect</span>
          </div>
        )}

        {/* Resume auto-rotate button */}
        {!autoRotate && (
          <button
            onClick={() => setAutoRotate(true)}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm border border-[#D4AF37]/30 rounded-full px-3 py-1.5 text-[10px] text-[#D4AF37] uppercase tracking-widest"
          >
            ↺ Auto-rotate
          </button>
        )}
      </div>

      {/* Bottom meta bar */}
      <div className="flex items-center justify-between px-6 pb-5">
        <div className="flex gap-3">
          {[
            { label: "Diam.", value: "19.9mm" },
            { label: "Weight", value: "3.0g" },
            { label: "Cond.", value: "XF-45" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-[9px] uppercase tracking-widest text-white/30">{label}</p>
              <p className="text-sm font-semibold text-white/80 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
          <span className="text-xs text-[#D4AF37] font-semibold">Coinaty</span>
        </div>
      </div>
    </div>
  );
}
