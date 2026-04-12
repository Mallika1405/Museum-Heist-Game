import { useState, useRef, useEffect, useCallback } from "react";
import { useArtHeistState } from "@/hooks/useArtHeistState";
import {
  searchArtifacts, fetchDossier, fetchQuestions,
  fetchCharacterLines, fetchControversy, fetchDailyHeist,
  fetchDeadZoneMessage, fetchArtifactTrail,
} from "@/lib/api";
import type {
  ArtifactResult, Museum, CharacterLines, ControversyResult,
  DailyHeist, SourceInfo, ArtifactTrail,
} from "@/lib/api";
import guardianImg from "@/assets/guardian.png";
import thiefImg from "@/assets/thief-new.png";
import { toast } from "sonner";
import WorldMap from "@/components/WorldMap";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const FEATURED_MUSEUMS: Museum[] = [
  { name: "British Museum", city: "London", country: "UK", emoji: "🇬🇧", lat: 51.5194, lng: -0.1270 },
  { name: "The Metropolitan Museum of Art", city: "New York", country: "USA", emoji: "🇺🇸", lat: 40.7794, lng: -73.9632 },
  { name: "Louvre Museum", city: "Paris", country: "France", emoji: "🇫🇷", lat: 48.8606, lng: 2.3376 },
  { name: "Egyptian Museum", city: "Cairo", country: "Egypt", emoji: "🇪🇬", lat: 30.0478, lng: 31.2336 },
  { name: "National Museum of China", city: "Beijing", country: "China", emoji: "🇨🇳", lat: 39.9054, lng: 116.3976 },
];

const RARITY_COLORS = {
  Common:    { badge: "bg-gray-500",   border: "border-gray-400",   glow: "" },
  Rare:      { badge: "bg-blue-500",   border: "border-blue-400",   glow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]" },
  Legendary: { badge: "bg-yellow-500", border: "border-yellow-400", glow: "shadow-[0_0_20px_rgba(234,179,8,0.6)]" },
};

/* ─── BANTER TYPES + FETCH ─── */
interface BanterLine { speaker: "guardian" | "thief"; text: string; }

async function fetchBanter(context: string, artifactName = "", museumName = ""): Promise<BanterLine[]> {
  try {
    const resp = await fetch(`${API_BASE}/api/banter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, artifactName, museumName }),
    });
    if (!resp.ok) throw new Error("banter failed");
    const data = await resp.json();
    return Array.isArray(data.lines) ? data.lines : [];
  } catch {
    return [
      { speaker: "guardian", text: "You will not lay a finger on that artifact." },
      { speaker: "thief",    text: "Relax. I am just admiring it from a distance." },
      { speaker: "guardian", text: "I know exactly what you are planning." },
      { speaker: "thief",    text: "Then you know there is nothing you can do about it." },
    ];
  }
}

/* ─── BANTER TICKER HOOK ─── */
function useBanterTicker(lines: BanterLine[], intervalMs = 2800) {
  const [visibleIndex, setVisibleIndex] = useState(0);

  useEffect(() => {
    if (lines.length === 0) return;
    setVisibleIndex(0);
    const timer = setInterval(() => {
      setVisibleIndex((prev) => {
        // Stop at last line, don't loop — new banter loads on next phase
        if (prev >= lines.length - 1) return prev;
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [lines]);

  const currentLine = lines[visibleIndex];
  const lastGuardian = lines.slice(0, visibleIndex + 1).filter(l => l?.speaker === "guardian").slice(-1)[0]?.text;
  const lastThief    = lines.slice(0, visibleIndex + 1).filter(l => l?.speaker === "thief").slice(-1)[0]?.text;

  return { guardianLine: lastGuardian, thiefLine: lastThief, activeSpeaker: currentLine?.speaker };
}

/* ─── CHARACTER SIDEBAR ─── */
// Big characters pinned to bottom corners with speech bubbles above them
function CharacterSidebar({
  guardianLine,
  thiefLine,
  activeSpeaker,
  guardianClass = "",
  thiefClass = "",
  size = "lg",
}: {
  guardianLine?: string;
  thiefLine?: string;
  activeSpeaker?: "guardian" | "thief";
  guardianClass?: string;
  thiefClass?: string;
  size?: "md" | "lg";
}) {
  const imgSize = size === "md" ? "w-36 h-36" : "w-48 h-48";

  return (
    <>
      {/* GUARDIAN — bottom left */}
      <div className="fixed bottom-0 left-0 z-30 flex flex-col items-start pb-1 pl-2 pointer-events-none select-none">
        {guardianLine && (
          <div
            key={guardianLine}
            className="mb-2 ml-1 bg-card/95 border border-blue-400/40 rounded-2xl rounded-bl-none px-4 py-2.5 max-w-[220px] shadow-xl fade-in-up"
            style={{ backdropFilter: "blur(10px)" }}
          >
            <p className="text-xs text-foreground leading-relaxed">{guardianLine}</p>
          </div>
        )}
        <img
          src={guardianImg}
          alt="Guardian"
          className={`${imgSize} object-contain float-animate drop-shadow-2xl transition-all duration-500 ${guardianClass} ${activeSpeaker === "guardian" ? "scale-110" : "scale-100"}`}
          style={{ filter: "drop-shadow(0 0 14px rgba(100,150,255,0.4))" }}
        />
      </div>

      {/* THIEF — bottom right */}
      <div className="fixed bottom-0 right-0 z-30 flex flex-col items-end pb-1 pr-2 pointer-events-none select-none">
        {thiefLine && (
          <div
            key={thiefLine}
            className="mb-2 mr-1 bg-card/95 border border-[#c89b3c]/40 rounded-2xl rounded-br-none px-4 py-2.5 max-w-[220px] shadow-xl fade-in-up"
            style={{ backdropFilter: "blur(10px)" }}
          >
            <p className="text-xs text-foreground leading-relaxed">{thiefLine}</p>
          </div>
        )}
        <img
          src={thiefImg}
          alt="Thief"
          className={`${imgSize} object-contain float-animate drop-shadow-2xl transition-all duration-500 ${thiefClass} ${activeSpeaker === "thief" ? "scale-110" : "scale-100"}`}
          style={{ animationDelay: "1.5s", filter: "drop-shadow(0 0 14px rgba(200,155,60,0.4))" }}
        />
      </div>
    </>
  );
}

/* ─── BANTER SIDEBAR ─── */
// Combines ticker + sidebar — drop this anywhere to get live banter characters
function BanterSidebar({
  banterLines,
  guardianClass = "",
  thiefClass = "",
  size = "lg",
}: {
  banterLines: BanterLine[];
  guardianClass?: string;
  thiefClass?: string;
  size?: "md" | "lg";
}) {
  const { guardianLine, thiefLine, activeSpeaker } = useBanterTicker(banterLines);
  return (
    <CharacterSidebar
      guardianLine={guardianLine}
      thiefLine={thiefLine}
      activeSpeaker={activeSpeaker}
      guardianClass={guardianClass}
      thiefClass={thiefClass}
      size={size}
    />
  );
}

/* ─── NIA LOADER WITH LIVE BANTER ─── */
function NiaLoader({
  message,
  artifactName = "",
  museumName = "",
}: {
  message: string;
  artifactName?: string;
  museumName?: string;
}) {
  const [banterLines, setBanterLines] = useState<BanterLine[]>([
    { speaker: "guardian", text: "NIA is scanning. Stand by." },
    { speaker: "thief",    text: "Come on... I have plans tonight." },
    { speaker: "guardian", text: "Your impatience is embarrassing." },
    { speaker: "thief",    text: "Your outfit is embarrassing. We are even." },
  ]);

  useEffect(() => {
    fetchBanter("searching", artifactName, museumName).then(setBanterLines).catch(() => {});
  }, [artifactName, museumName]);

  const { guardianLine, thiefLine, activeSpeaker } = useBanterTicker(banterLines, 2200);

  return (
    <div className="flex flex-col items-center gap-6 py-8 w-full max-w-lg mx-auto px-6">
      {/* Spinner */}
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-base font-black text-primary">N</span>
      </div>
      <p className="text-primary font-semibold text-base animate-pulse text-center">{message}</p>

      {/* Characters */}
      <div className="flex items-end justify-between w-full gap-6 mt-4">
        {/* Guardian */}
<div className="flex flex-col items-center flex-1 gap-3">
  {/* Fixed height bubble area so images always align */}
  <div className="h-24 w-full flex items-end">
    <div
      className={`bg-card/90 border border-blue-400/30 rounded-2xl rounded-bl-none px-4 py-3 w-full transition-all duration-500 ${activeSpeaker === "guardian" ? "opacity-100" : "opacity-40"}`}
      style={{ backdropFilter: "blur(8px)" }}
    >
      <p className="text-sm text-foreground leading-relaxed">{guardianLine || " "}</p>
    </div>
  </div>
  <img
    src={guardianImg}
    alt="Guardian"
    className={`w-44 h-44 object-contain float-animate transition-all duration-500 ${activeSpeaker === "guardian" ? "scale-110" : "scale-95 opacity-60"}`}
    style={{ filter: "drop-shadow(0 0 14px rgba(100,150,255,0.4))" }}
  />
  <span className="text-xs tracking-widest text-blue-400/60 uppercase font-semibold">Guardian</span>
</div>

<div className="text-sm text-[#c89b3c]/30 uppercase tracking-wider pb-20 shrink-0 font-bold">vs</div>

{/* Thief */}
<div className="flex flex-col items-center flex-1 gap-3">
  {/* Fixed height bubble area so images always align */}
  <div className="h-24 w-full flex items-end">
    <div
      className={`bg-card/90 border border-[#c89b3c]/30 rounded-2xl rounded-br-none px-4 py-3 w-full transition-all duration-500 ${activeSpeaker === "thief" ? "opacity-100" : "opacity-40"}`}
      style={{ backdropFilter: "blur(8px)" }}
    >
      <p className="text-sm text-foreground leading-relaxed">{thiefLine || " "}</p>
    </div>
  </div>
  <img
    src={thiefImg}
    alt="Thief"
    className={`w-44 h-44 object-contain float-animate transition-all duration-500 ${activeSpeaker === "thief" ? "scale-110" : "scale-95 opacity-60"}`}
    style={{ animationDelay: "1.5s", filter: "drop-shadow(0 0 14px rgba(200,155,60,0.4))" }}
  />
  <span className="text-xs tracking-widest text-[#c89b3c]/60 uppercase font-semibold">Thief</span>
</div>
      </div>
    </div>
  );
}

/* ─── SOURCE BADGE ─── */
const SourceBadge = ({ sourceInfo }: { sourceInfo: SourceInfo }) => (
  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-secondary/60 border border-border/60 rounded-full text-muted-foreground">
    <span>{sourceInfo.badge}</span>
    <span>{sourceInfo.label}</span>
  </span>
);

/* ─── CONTROVERSY METER ─── */
const ControversyMeter = ({ controversy }: { controversy: ControversyResult }) => {
  const score = controversy.controversyScore;
  const color = score >= 70 ? "bg-red-500" : score >= 40 ? "bg-orange-400" : "bg-yellow-500";
  const label = score >= 70 ? "HOT" : score >= 40 ? "Disputed" : "Quiet";
  return (
    <div className="bg-secondary/30 border border-[#c89b3c]/20 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#c89b3c] tracking-wider uppercase">Controversy Index</span>
        <span className="text-xs font-bold text-foreground/80">{label}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
        <div className={`h-full ${color} transition-all duration-1000 rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-foreground/70 leading-relaxed">{controversy.summary}</p>
      {controversy.keywordsFound.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {controversy.keywordsFound.slice(0, 4).map((kw) => (
            <span key={kw} className="text-[10px] px-2 py-0.5 bg-destructive/10 text-destructive/80 rounded-full border border-destructive/20">{kw}</span>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── ARTIFACT CARD ─── */
const ArtifactCard = ({ artifact, onClick, index }: { artifact: ArtifactResult; onClick: () => void; index: number }) => {
  const rc = RARITY_COLORS[artifact.rarity];
  return (
    <button onClick={onClick}
      className={`bg-card border-2 ${rc.border} ${rc.glow} rounded-2xl p-5 text-left hover:scale-105 transition-all duration-300 group animate-[dealIn_0.5s_ease-out_forwards] opacity-0 w-full`}
      style={{ animationDelay: `${index * 0.15}s` }}>
      <div className="flex items-center justify-between mb-3">
        <span className={`${rc.badge} text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider`}>{artifact.rarity}</span>
        <span className="text-xs text-muted-foreground">{artifact.era}</span>
      </div>
      <h3 className="text-base font-bold text-primary mb-1 group-hover:text-primary/80 transition-colors">{artifact.name}</h3>
      <p className="text-sm text-muted-foreground mb-2">{artifact.museum}</p>
      <p className="text-xs text-foreground/60 leading-relaxed">{artifact.shortDescription}</p>
      <div className="flex items-center justify-between mt-3">
        {artifact.sourceInfo && <SourceBadge sourceInfo={artifact.sourceInfo} />}
        {artifact.rarity === "Legendary" && (
          <div className="flex-1 ml-2 h-0.5 bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 rounded animate-pulse" />
        )}
      </div>
    </button>
  );
};

/* ─── COLLECTION CARD ─── */
const CollectionCard = ({ artifact, index }: { artifact: any; index: number }) => {
  const rc = RARITY_COLORS[artifact.rarity as keyof typeof RARITY_COLORS];
  const cardRef = useRef<HTMLDivElement>(null);
  const handleMouse = (e: React.MouseEvent) => {
    const el = cardRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 20}deg) rotateX(${-y * 20}deg) scale(1.04)`;
  };
  const handleLeave = () => { if (cardRef.current) cardRef.current.style.transform = ""; };
  return (
    <div ref={cardRef} onMouseMove={handleMouse} onMouseLeave={handleLeave}
      className={`bg-card border-2 ${rc.border} ${rc.glow} rounded-2xl p-5 transition-transform duration-200 cursor-default animate-[dealIn_0.4s_ease-out_forwards] opacity-0`}
      style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="flex items-center justify-between mb-3">
        <span className={`${rc.badge} text-white text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider`}>{artifact.rarity}</span>
        {artifact.sourceInfo && <SourceBadge sourceInfo={artifact.sourceInfo} />}
      </div>
      <h3 className="text-sm font-bold text-primary mb-1">{artifact.name}</h3>
      <p className="text-xs text-muted-foreground mb-1">{artifact.museum}</p>
      <p className="text-xs text-foreground/50 leading-relaxed mb-3">{artifact.shortDescription}</p>
      <div className="pt-2 border-t border-border/40">
        <p className="text-[10px] text-muted-foreground tracking-wide">{artifact.region || "Unknown Region"} · {artifact.era}</p>
      </div>
      {artifact.rarity === "Legendary" && (
        <div className="mt-3 h-0.5 bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 rounded animate-pulse" />
      )}
    </div>
  );
};

/* ─── DAILY HEIST BANNER ─── */
const DailyHeistBanner = ({ daily, onStart }: { daily: DailyHeist; onStart: () => void }) => (
  <div className="w-full max-w-md mx-auto mb-6 fade-in-up" style={{ animationDelay: "1.1s" }}>
    <div className="relative overflow-hidden border border-[#c89b3c]/30 p-4 cursor-pointer hover:border-[#c89b3c]/60 transition-all duration-300 group"
      style={{ background: "linear-gradient(135deg, rgba(200,155,60,0.08) 0%, rgba(10,8,5,0.9) 100%)", borderRadius: "2px" }}
      onClick={onStart}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c89b3c]/50 to-transparent" />
      <div className="flex items-start gap-3">
        <div className="text-[10px] font-bold text-[#c89b3c] border border-[#c89b3c]/40 rounded px-1.5 py-1 mt-0.5 leading-none tracking-wider uppercase shrink-0">Today</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] tracking-[0.3em] text-[#c89b3c]/60 uppercase">Today's Heist</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-[#c89b3c]/20 text-[#c89b3c] rounded uppercase tracking-wider">{daily.difficulty}</span>
            {daily.niaUsed && <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded uppercase tracking-wider">Live</span>}
          </div>
          <p className="text-sm font-semibold text-primary truncate" style={{ fontFamily: "'Georgia', serif" }}>{daily.artifactName}</p>
          <p className="text-xs text-muted-foreground truncate">{daily.museum}</p>
          <p className="text-xs text-[#c89b3c]/50 mt-1 italic leading-relaxed line-clamp-2">{daily.newsHook}</p>
        </div>
        <div className="text-[#c89b3c]/40 group-hover:text-[#c89b3c] transition-colors text-lg mt-1">→</div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c89b3c]/30 to-transparent" />
    </div>
  </div>
);

/* ─── HOME SCREEN ─── */
const HomeScreen = ({ onStart, onCollection, onDailyHeist, collectionCount }: {
  onStart: () => void; onCollection: () => void;
  onDailyHeist: (daily: DailyHeist) => void; collectionCount: number;
}) => {
  const [show, setShow] = useState(false);
  const [daily, setDaily] = useState<DailyHeist | null>(null);
  useEffect(() => {
    setShow(true);
    fetchDailyHeist().then((d) => { if (d) setDaily(d); }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#0a0805]">
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(200,155,60,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(200,155,60,0.07) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
        maskImage: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)",
        WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)",
        transform: "perspective(600px) rotateX(40deg)", transformOrigin: "bottom center", bottom: 0, top: "30%",
      }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center top, rgba(200,155,60,0.18) 0%, transparent 70%)" }} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 3px)" }} />
      {[["top-6 left-6","border-t-2 border-l-2"],["top-6 right-6","border-t-2 border-r-2"],
        ["bottom-6 left-6","border-b-2 border-l-2"],["bottom-6 right-6","border-b-2 border-r-2"]].map(([pos,border],i) => (
        <div key={i} className={`absolute ${pos} ${border} border-[#c89b3c]/40 w-10 h-10 pointer-events-none`} />
      ))}

      <div className={`relative z-10 flex flex-col items-center transition-all duration-1000 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full border border-[#c89b3c]/30 scale-[1.8] animate-ping" style={{ animationDuration: "3s" }} />
          <div className="absolute inset-0 rounded-full border border-[#c89b3c]/20 scale-[2.4]" />
          <div className="w-16 h-16 rounded-full bg-[#c89b3c]/10 border border-[#c89b3c]/40 flex items-center justify-center backdrop-blur-sm">
            <span className="text-3xl">🏛️</span>
          </div>
        </div>

        <div className="text-center mb-3 fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="text-[11px] tracking-[0.4em] text-[#c89b3c]/60 font-medium uppercase mb-2">— World Museum Heist —</div>
          <h1 className="font-black uppercase tracking-tight leading-none shimmer-text"
            style={{ fontSize: "clamp(4rem,12vw,8rem)", fontFamily: "'Georgia',serif", textShadow: "0 0 80px rgba(200,155,60,0.4), 0 2px 0 rgba(0,0,0,0.8)", letterSpacing: "-0.02em" }}>
           Heistory 
          </h1>
        </div>

        <p className="text-[#f3ead1]/40 text-center text-sm max-w-xs mb-10 tracking-wide fade-in-up" style={{ animationDelay: "0.35s" }}>
          Explore real museums. Answer questions. Steal history.
        </p>

        <div className="flex items-end gap-8 md:gap-16 mb-10 fade-in-up" style={{ animationDelay: "0.5s" }}>
          <div className="flex flex-col items-center gap-0">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-blue-500/5 blur-xl" />
              <img src={guardianImg} alt="Guardian" className="w-72 h-72 object-contain float-animate drop-shadow-2xl relative z-10"
                style={{ filter: "drop-shadow(0 0 20px rgba(100,150,255,0.3))" }} />
            </div>
            <div className="text-center -mt-4"><div className="text-sm tracking-[0.3em] text-[#c89b3c]/80 uppercase">The Guardian</div></div>
          </div>
          <div className="flex flex-col items-center mb-8 fade-in-up" style={{ animationDelay: "0.65s" }}>
            <div className="text-xs tracking-[0.2em] text-[#c89b3c]/40 uppercase mb-1">versus</div>
            <div className="font-black text-[#c89b3c] leading-none"
              style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontFamily: "'Georgia',serif", textShadow: "0 0 40px rgba(200,155,60,0.6)" }}>VS</div>
          </div>
          <div className="flex flex-col items-center gap-0">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-amber-500/5 blur-xl" />
              <img src={thiefImg} alt="Thief" className="w-72 h-72 object-contain float-animate drop-shadow-2xl relative z-10"
                style={{ animationDelay: "1.5s", filter: "drop-shadow(0 0 20px rgba(200,155,60,0.35))" }} />
            </div>
            <div className="text-center -mt-4"><div className="text-sm tracking-[0.3em] text-[#c89b3c]/80 uppercase">The Thief</div></div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6 fade-in-up" style={{ animationDelay: "0.8s" }}>
          <button onClick={onStart} className="group relative px-10 py-4 font-bold text-base tracking-widest uppercase overflow-hidden transition-all duration-300 hover:scale-105"
            style={{ background: "linear-gradient(135deg,#c89b3c,#e8c060,#c89b3c)", color: "#1a0f00", borderRadius: "2px", boxShadow: "0 0 30px rgba(200,155,60,0.4), inset 0 1px 0 rgba(255,255,255,0.2)", fontFamily: "'Georgia',serif" }}>
            <span className="relative z-10">Start Heist</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          {collectionCount > 0 && (
            <button onClick={onCollection} className="px-8 py-4 font-semibold text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105"
              style={{ background: "transparent", color: "#c89b3c", border: "1px solid rgba(200,155,60,0.4)", borderRadius: "2px" }}>
              The Vault ({collectionCount})
            </button>
          )}
        </div>

        {daily && <DailyHeistBanner daily={daily} onStart={() => onDailyHeist(daily)} />}

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 fade-in-up" style={{ animationDelay: "1s" }}>
          {["Real Museums","AI-Powered","Collectible Cards","Live Data"].map((f,i) => (
            <span key={f} className="text-[10px] tracking-[0.25em] text-[#c89b3c]/35 uppercase">
              {i > 0 && <span className="mr-6">·</span>}{f}
            </span>
          ))}
        </div>
      </div>

      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} className="absolute rounded-full particle" style={{
            left: `${5 + Math.random() * 90}%`, bottom: "0",
            width: 1 + Math.random() * 3, height: 1 + Math.random() * 3,
            background: `hsl(43 72% ${50 + Math.random() * 20}% / 0.4)`,
            animationDelay: `${Math.random() * 6}s`, animationDuration: `${4 + Math.random() * 5}s`,
            animationIterationCount: "infinite",
          }} />
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MAIN INDEX
══════════════════════════════════════════════════════ */
const Index = () => {
  const { state, update, addToCollection } = useArtHeistState();
  const [answered, setAnswered]       = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [clickedPos, setClickedPos]   = useState<[number, number] | null>(null);
  const [deadZoneMsg, setDeadZoneMsg] = useState<string | null>(null);
  const [artifactTrail, setArtifactTrail] = useState<ArtifactTrail | null>(null);
  const [controversy, setControversy] = useState<ControversyResult | null>(null);
  const [characterLines, setCharacterLines] = useState<CharacterLines>({
    guardian: "These artifacts are under my protection.",
    thief: "For now.",
  });

  // Banter lines — refreshed per phase by calling Gemini via /api/banter
  const [banterLines, setBanterLines] = useState<BanterLine[]>([
    { speaker: "guardian", text: "These artifacts are under my protection." },
    { speaker: "thief",    text: "For now." },
    { speaker: "guardian", text: "I have dedicated my life to this collection." },
    { speaker: "thief",    text: "How charming. I dedicate mine to redistributing it." },
  ]);

  const loadBanter = useCallback((context: string, artifactName = "", museumName = "") => {
    fetchBanter(context, artifactName, museumName).then(setBanterLines).catch(() => {});
  }, []);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
      const data = await resp.json();
      return data.address?.country || data.address?.state || "Unknown Region";
    } catch { return "Unknown Region"; }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setClickedPos([lat, lng]);
    setDeadZoneMsg(null);
    update({ loading: true, loadingMessage: "NIA is scanning this region..." });
    const region = await reverseGeocode(lat, lng);
    update({ selectedRegion: region, loadingMessage: `NIA is searching ${region}...` });
    try {
      const { artifacts, deadZone } = await searchArtifacts(region);
      if (deadZone || artifacts.length === 0) {
        const msg = await fetchDeadZoneMessage(region);
        setDeadZoneMsg(msg);
        update({ loading: false });
        return;
      }
      update({ artifacts, phase: "artifact-select", loading: false });
      loadBanter("deal", artifacts[0]?.name, artifacts[0]?.museum);
    } catch {
      toast.error("Search failed. Try another location.");
      update({ loading: false });
    }
  };

  const handleMuseumSelect = async (museum: Museum) => {
    setDeadZoneMsg(null);
    update({ selectedMuseum: museum, loading: true, loadingMessage: `NIA is searching ${museum.name}...`, selectedRegion: `${museum.city}, ${museum.country}` });
    try {
      const { artifacts, deadZone } = await searchArtifacts(museum.city, museum.name);
      if (deadZone || artifacts.length === 0) {
        const msg = await fetchDeadZoneMessage(museum.name);
        setDeadZoneMsg(msg);
        update({ loading: false });
        return;
      }
      update({ artifacts, phase: "artifact-select", loading: false });
      loadBanter("deal", artifacts[0]?.name, artifacts[0]?.museum);
    } catch {
      toast.error("Search failed. Try again.");
      update({ loading: false });
    }
  };

  const handleArtifactSelect = async (artifact: ArtifactResult) => {
    update({ selectedArtifact: artifact, phase: "dossier", loading: true, loadingMessage: "NIA is compiling the dossier..." });
    setControversy(null);
    setArtifactTrail(null);
    loadBanter("deal", artifact.name, artifact.museum);
    try {
      const [dossier] = await Promise.all([
        fetchDossier(artifact.name, artifact.museum),
        fetchControversy(artifact.name, artifact.museum).then(setControversy).catch(() => {}),
        fetchCharacterLines(artifact.name, artifact.museum).then(setCharacterLines).catch(() => {}),
        fetchArtifactTrail(artifact.name, state.selectedRegion || "").then(setArtifactTrail).catch(() => {}),
      ]);
      update({ dossier, loading: false });
    } catch {
      update({ dossier: { dossier: "Intel corrupted. Proceed with caution.", realTheftFound: false, niaSource: "unknown" }, loading: false });
    }
  };

  const handleDailyHeist = async (daily: DailyHeist) => {
    const fakeArtifact: ArtifactResult = {
      name: daily.artifactName, museum: daily.museum,
      shortDescription: daily.shortDescription, era: daily.era,
      niaResultCount: daily.niaResultCount,
      rarity: daily.difficulty === "hard" ? "Legendary" : daily.difficulty === "medium" ? "Rare" : "Common",
    };
    update({ selectedArtifact: fakeArtifact, phase: "dossier", loading: true, loadingMessage: "Loading today's heist briefing..." });
    setControversy(null); setArtifactTrail(null);
    loadBanter("deal", daily.artifactName, daily.museum);
    try {
      const [dossier] = await Promise.all([
        fetchDossier(daily.artifactName, daily.museum),
        fetchControversy(daily.artifactName, daily.museum).then(setControversy).catch(() => {}),
        fetchCharacterLines(daily.artifactName, daily.museum).then(setCharacterLines).catch(() => {}),
        fetchArtifactTrail(daily.artifactName, daily.museum).then(setArtifactTrail).catch(() => {}),
      ]);
      update({ dossier, loading: false });
    } catch {
      update({ dossier: { dossier: daily.heistBriefing, realTheftFound: false, niaSource: "NIA Daily" }, loading: false });
    }
  };

  const handleBeginHeist = async () => {
    if (!state.selectedArtifact) return;
    update({ phase: "heist", loading: true, loadingMessage: "NIA is preparing intel on the target...", currentQuestionIndex: 0, lives: 2 });
    loadBanter("questioning", state.selectedArtifact.name, state.selectedArtifact.museum);
    const difficulty = state.selectedArtifact.rarity === "Common" ? "easy" : state.selectedArtifact.rarity === "Rare" ? "medium" : "hard";
    try {
      const questions = await fetchQuestions(state.selectedArtifact.name, state.selectedArtifact.museum, difficulty);
      update({ questions, loading: false });
    } catch {
      toast.error("Failed to load intel. Aborting heist.");
      update({ phase: "map", loading: false });
    }
  };

  const handleAnswer = (index: number) => {
    if (answered || !state.questions[state.currentQuestionIndex]) return;
    setAnswered(true);
    const correct = index === state.questions[state.currentQuestionIndex].correct;
    setLastCorrect(correct);
    if (!correct) {
      const newLives = state.lives - 1;
      update({ lives: newLives });
      if (newLives <= 0) {
        loadBanter("defeat", state.selectedArtifact?.name, state.selectedArtifact?.museum);
        setTimeout(() => update({ phase: "defeat" }), 1800);
        return;
      }
    }
    setTimeout(() => {
      setAnswered(false); setLastCorrect(null);
      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex >= state.questions.length) {
        loadBanter("victory", state.selectedArtifact?.name, state.selectedArtifact?.museum);
        addToCollection(state.selectedArtifact!, state.selectedRegion);
      } else {
        update({ currentQuestionIndex: nextIndex });
      }
    }, 1800);
  };

  const goToMap = () => {
    update({ phase: "map", artifacts: [], selectedArtifact: null, dossier: null, questions: [], currentQuestionIndex: 0, lives: 2, loading: false });
    setAnswered(false); setLastCorrect(null); setClickedPos(null); setControversy(null);
    setDeadZoneMsg(null); setArtifactTrail(null);
    loadBanter("searching");
  };

  /* ── HOME ── */
  if (state.phase === "home") {
    return (
      <HomeScreen
        onStart={() => { update({ phase: "map" }); loadBanter("searching"); }}
        onCollection={() => { update({ phase: "collection" }); loadBanter("vault"); }}
        onDailyHeist={handleDailyHeist}
        collectionCount={state.collection.length}
      />
    );
  }

  /* ── SHARED SHELL ── */
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="scanline-overlay" />

      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="absolute rounded-full particle" style={{
            left: `${Math.random() * 100}%`, bottom: "0",
            width: 3 + Math.random() * 3, height: 3 + Math.random() * 3,
            background: "hsl(43 72% 55% / 0.4)",
            animationDelay: `${Math.random() * 4}s`, animationDuration: `${3 + Math.random() * 3}s`,
            animationIterationCount: "infinite",
          }} />
        ))}
      </div>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between w-full">
          <button onClick={() => update({ phase: "home" })} className="flex items-center gap-2 hover:opacity-80 transition mr-auto">
  <h1 className="text-xl font-bold shimmer-text tracking-wider">Heistory</h1>
</button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Score: <span className="text-primary font-semibold">{state.score}</span></span>
            <button onClick={() => { update({ phase: "collection" }); loadBanter("vault"); }}
              className="px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition text-sm text-foreground">
              Vault · {state.collection.length}
            </button>
          </div>
        </div>
      </nav>

      {/* LOADING — shows banter while NIA works */}
      {state.loading && (
        <div className="fixed inset-0 z-40 bg-background/90 backdrop-blur flex items-center justify-center">
          <NiaLoader
            message={state.loadingMessage}
            artifactName={state.selectedArtifact?.name}
            museumName={state.selectedArtifact?.museum}
          />
        </div>
      )}

      {/* ══ MAP ══ */}
      {(state.phase === "map" || state.phase === "museum-select") && !state.loading && (
  <div className="pt-16 flex flex-col h-screen overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto bg-card/50">
            <span className="text-xs text-muted-foreground whitespace-nowrap mr-2">Quick pick:</span>
            {FEATURED_MUSEUMS.map((m) => (
              <button key={m.name} onClick={() => handleMuseumSelect(m)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full hover:bg-primary hover:text-primary-foreground transition text-xs whitespace-nowrap shrink-0">
                <span>{m.emoji}</span><span>{m.name}</span>
              </button>
            ))}
          </div>
          <div className="relative flex-1 overflow-hidden">
            <WorldMap museums={FEATURED_MUSEUMS} clickedPos={clickedPos} onMapClick={handleMapClick} onMuseumSelect={handleMuseumSelect} />

            {deadZoneMsg && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-card/95 border border-[#c89b3c]/40 rounded-xl px-5 py-3 max-w-sm text-center fade-in-up shadow-lg">
                <p className="text-[10px] tracking-[0.25em] text-[#c89b3c]/70 uppercase font-semibold mb-1">Nothing here</p>
                <p className="text-sm text-foreground/80 italic">"{deadZoneMsg}"</p>
              </div>
            )}

            <div className="absolute bottom-52 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur rounded-xl px-6 py-3 border border-border z-[1000]">
              <p className="text-sm text-center text-foreground/80">Click anywhere on the map or pick a museum above</p>
            </div>
          </div>
          <BanterSidebar banterLines={banterLines} />
        </div>
      )}

      {/* ══ ARTIFACT SELECT ══ */}
      {state.phase === "artifact-select" && !state.loading && (
        <div className="pt-20 pb-56 min-h-screen flex flex-col items-center px-4">
          <div className="mb-6 text-center fade-in-up max-w-lg">
            <p className="text-[10px] tracking-[0.3em] text-[#c89b3c]/60 uppercase mb-2">{state.selectedRegion}</p>
            <h2 className="text-2xl font-bold text-primary mb-2">Choose Your Target</h2>
            <p className="text-sm text-muted-foreground">
              The thief has spotted these artifacts. Pick one — then prove you deserve it.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl w-full">
            {state.artifacts.map((a, i) => (
              <ArtifactCard key={a.name} artifact={a} index={i} onClick={() => handleArtifactSelect(a)} />
            ))}
          </div>
          <button onClick={goToMap} className="mt-6 text-sm text-muted-foreground hover:text-foreground transition">Back to map</button>
          <BanterSidebar banterLines={banterLines} />
        </div>
      )}

      {/* ══ DOSSIER ══ */}
      {state.phase === "dossier" && state.selectedArtifact && !state.loading && (
        <div className="pt-20 pb-56 min-h-screen flex justify-center px-4 py-8">
          <div className="max-w-xl w-full space-y-4 fade-in-up">

            {/* Identity card */}
            <div className="bg-card border-2 border-border rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-4 right-4 rotate-12 border-2 border-destructive text-destructive text-[10px] font-bold px-2 py-0.5 rounded opacity-70 tracking-widest">TOP SECRET</div>
              <p className="text-[10px] tracking-[0.3em] text-[#c89b3c]/60 uppercase mb-1">Heist Briefing</p>
              <h2 className="text-2xl font-bold text-primary mb-1">{state.selectedArtifact.name}</h2>
              <p className="text-sm text-muted-foreground mb-3">{state.selectedArtifact.museum} · {state.selectedArtifact.era}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`${RARITY_COLORS[state.selectedArtifact.rarity].badge} text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider`}>
                  {state.selectedArtifact.rarity}
                </span>
                {state.dossier?.sourceInfo && <SourceBadge sourceInfo={state.dossier.sourceInfo} />}
              </div>
            </div>

            {/* Intel briefing */}
<div className="bg-card border border-border rounded-2xl p-5">
  <p className="text-[10px] tracking-[0.25em] text-[#c89b3c]/70 uppercase font-semibold mb-3">Intel Report</p>
  <div className="space-y-2">
    {(state.dossier?.dossier || "")
  .replace(/\*\*/g, "")
  .replace(/\*/g, "")
  .replace(/#+\s/g, "")
  .replace(/\/\//g, "")
  .replace(/CLASSIFIED|EYES ONLY|URGENT REPORT|Subject:/gi, "")
  .trim()
  .split(/(?<=[.!?])\s+/)
  .filter(Boolean)
  .map((sentence, i) => (
    <p key={i} className="text-sm text-foreground/85 leading-relaxed pl-3 border-l-2 border-[#c89b3c]/20">
      {sentence}
    </p>
  ))}
  </div>
  <p className="text-[10px] text-muted-foreground mt-4">Source: NIA via {state.dossier?.niaSource}</p>
</div>

            {/* The deal */}
            <div className="bg-[#c89b3c]/5 border border-[#c89b3c]/30 rounded-2xl p-5">
              <p className="text-[10px] tracking-[0.25em] text-[#c89b3c] uppercase font-bold mb-2">The Thief's Offer</p>
              <p className="text-sm text-foreground/90 leading-relaxed">
                Answer <span className="text-primary font-bold">3 questions</span> about this artifact correctly and it is yours to keep in your vault.
                Fail — and it stays in my collection. Permanently.
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">
                Difficulty: <span className="text-primary">{state.selectedArtifact.rarity === "Common" ? "easy" : state.selectedArtifact.rarity === "Rare" ? "medium" : "hard"}</span>
              </p>
            </div>

            {controversy && controversy.controversyScore > 0 && <ControversyMeter controversy={controversy} />}

            {artifactTrail && (
              <div className="bg-secondary/20 border border-[#c89b3c]/20 rounded-2xl p-4">
                <p className="text-[10px] tracking-[0.25em] text-[#c89b3c]/70 uppercase font-semibold mb-2">Artifact Trail</p>
                <p className="text-sm text-foreground/80">
                  Historical connection to <span className="text-primary font-semibold">{artifactTrail.region}</span> — {artifactTrail.connection}
                </p>
              </div>
            )}

            {state.dossier?.realTheftFound && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
                <p className="text-xs font-bold text-destructive mb-1 tracking-wide">REAL HEIST ON RECORD</p>
                <p className="text-sm text-foreground/80">{state.dossier.theftSummary}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={goToMap} className="px-5 py-3 bg-secondary text-foreground rounded-xl text-sm font-semibold hover:bg-secondary/80 transition">Abort</button>
              <button onClick={handleBeginHeist} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold tracking-widest uppercase hover:brightness-110 transition pulse-glow text-sm">
                Accept the Deal
              </button>
            </div>
          </div>
          <BanterSidebar banterLines={banterLines} />
        </div>
      )}

      {/* ══ HEIST ══ */}
      {state.phase === "heist" && !state.loading && (
        <div className="pt-20 pb-56 min-h-screen flex flex-col items-center px-4">
          <div className="w-full max-w-lg mb-6 fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] tracking-[0.25em] text-[#c89b3c]/60 uppercase">The Thief's Challenge</p>
                <h2 className="font-bold text-primary text-sm mt-0.5">{state.selectedArtifact?.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                {Array.from({ length: 2 }, (_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${i < state.lives ? "bg-primary border-primary" : "bg-transparent border-muted-foreground/30"}`} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {state.questions.map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  i < state.currentQuestionIndex ? "bg-green-500" : i === state.currentQuestionIndex ? "bg-primary animate-pulse" : "bg-secondary"
                }`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Question {state.currentQuestionIndex + 1} of {state.questions.length}</p>
          </div>

          {state.questions[state.currentQuestionIndex] && (
            <div className="w-full max-w-lg scale-in">
              <div className="bg-card border-2 border-border rounded-2xl p-6 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] tracking-[0.25em] text-[#c89b3c]/60 uppercase font-semibold">Intelligence Check</span>
                  {state.questions[state.currentQuestionIndex].sourceInfo && (
                    <SourceBadge sourceInfo={state.questions[state.currentQuestionIndex].sourceInfo!} />
                  )}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-5 leading-relaxed">
                  {state.questions[state.currentQuestionIndex].question}
                </h3>
                <div className="grid gap-3">
                  {state.questions[state.currentQuestionIndex].options.map((opt, i) => {
                    let cls = "bg-secondary hover:bg-primary hover:text-primary-foreground border-border";
                    if (answered) {
                      if (i === state.questions[state.currentQuestionIndex].correct) cls = "bg-green-600 text-white border-green-500 scale-[1.02]";
                      else if (lastCorrect === false && i !== state.questions[state.currentQuestionIndex].correct) cls = "bg-secondary opacity-35 border-border";
                    }
                    return (
                      <button key={i} onClick={() => handleAnswer(i)} disabled={answered}
                        className={`text-left px-5 py-3.5 rounded-xl border ${cls} transition-all duration-300 text-sm disabled:cursor-not-allowed`}>
                        <span className="font-bold text-primary/80 mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                      </button>
                    );
                  })}
                </div>
                {state.questions[state.currentQuestionIndex].niaSource && (
                  <p className="text-[10px] text-muted-foreground mt-4">Source: {state.questions[state.currentQuestionIndex].niaSource}</p>
                )}
              </div>

              {answered && lastCorrect !== null && (
                <div className={`text-center py-3 rounded-xl mb-3 font-semibold text-sm fade-in-up ${lastCorrect ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"}`}>
                  {lastCorrect ? "Correct. The thief is not pleased." : "Wrong. The thief gains ground."}
                </div>
              )}
              {answered && state.questions[state.currentQuestionIndex].fact && (
                <div className="text-xs text-primary/70 bg-card/60 border border-border/40 rounded-xl py-2.5 px-4 text-center fade-in-up">
                  Field note: {state.questions[state.currentQuestionIndex].fact}
                </div>
              )}
            </div>
          )}

          <BanterSidebar
            banterLines={banterLines}
            guardianClass={lastCorrect === true ? "scale-110" : ""}
            thiefClass={lastCorrect === false ? "-translate-x-6 scale-110" : lastCorrect === true ? "translate-x-4 opacity-70" : ""}
          />
        </div>
      )}

      {/* ══ VICTORY ══ */}
      {state.phase === "victory" && (
        <div className="pt-20 pb-56 min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <div className="fade-in-up max-w-md">
            <p className="text-[10px] tracking-[0.3em] text-[#c89b3c]/60 uppercase mb-3">Mission Complete</p>
            <h1 className="text-4xl font-black shimmer-text mb-3" style={{ fontFamily: "'Georgia',serif" }}>Artifact Secured</h1>
            <p className="text-foreground/70 mb-1 text-sm">
              The thief kept their word. <span className="text-primary font-semibold">{state.selectedArtifact?.name}</span> is now in your vault.
            </p>
            <div className={`inline-block ${RARITY_COLORS[state.selectedArtifact?.rarity || "Common"].badge} text-white text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider`}>
              {state.selectedArtifact?.rarity}
            </div>
            <div className="bg-card/60 border border-[#c89b3c]/20 rounded-2xl p-4 mb-6 text-left">
              <p className="text-[10px] tracking-[0.2em] text-[#c89b3c]/60 uppercase mb-2">The Thief Concedes</p>
              <p className="text-sm text-foreground/80 italic leading-relaxed">
                "You earned it. Knowledge is the only currency I respect — even more than a flawless heist. Don't make me regret this."
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={goToMap} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 transition hover:scale-105 text-sm tracking-wider">New Heist</button>
              <button onClick={() => { update({ phase: "collection" }); loadBanter("vault"); }}
                className="px-6 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition hover:scale-105 text-sm">View Vault</button>
            </div>
          </div>
          <BanterSidebar banterLines={banterLines} thiefClass="scale-90 opacity-80" />
        </div>
      )}

      {/* ══ DEFEAT ══ */}
      {state.phase === "defeat" && (
        <div className="pt-20 pb-56 min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <div className="fade-in-up max-w-md">
            <p className="text-[10px] tracking-[0.3em] text-destructive/60 uppercase mb-3">Mission Failed</p>
            <h1 className="text-4xl font-black text-destructive mb-3" style={{ fontFamily: "'Georgia',serif" }}>The Deal Is Off</h1>
            <p className="text-foreground/70 mb-1 text-sm">
              <span className="font-semibold text-foreground">{state.selectedArtifact?.name}</span> stays in the thief's collection.
            </p>
            <p className="text-muted-foreground text-xs mb-6">You didn't know enough to earn it.</p>
            <div className="bg-card/60 border border-destructive/20 rounded-2xl p-4 mb-6 text-left">
              <p className="text-[10px] tracking-[0.2em] text-destructive/60 uppercase mb-2">The Thief Gloats</p>
              <p className="text-sm text-foreground/80 italic leading-relaxed">
                "A deal's a deal. You didn't hold up your end. Come back when you've done your homework."
              </p>
            </div>
            <button onClick={goToMap} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 transition hover:scale-105 text-sm tracking-wider">Try Again</button>
          </div>
          <BanterSidebar banterLines={banterLines} thiefClass="scale-110" guardianClass="opacity-60 scale-90" />
        </div>
      )}

      {/* ══ COLLECTION / VAULT ══ */}
      {state.phase === "collection" && (
        <div className="pt-20 pb-56 min-h-screen px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start justify-between mb-2 fade-in-up">
              <div>
                <p className="text-[10px] tracking-[0.3em] text-[#c89b3c]/60 uppercase mb-1">Liberated from the Thief</p>
                <h2 className="text-3xl font-black shimmer-text" style={{ fontFamily: "'Georgia',serif" }}>The Vault</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {state.collection.length === 0
                    ? "Empty. The thief finds this hilarious."
                    : `${state.collection.length} artifact${state.collection.length !== 1 ? "s" : ""} — each earned by outsmarting the thief.`}
                </p>
              </div>
              <button onClick={goToMap} className="px-4 py-2 bg-secondary rounded-xl text-sm hover:bg-secondary/80 transition mt-1">Back to Map</button>
            </div>

            {state.collection.length === 0 ? (
              <div className="text-center py-24 fade-in-up">
                <div className="w-20 h-20 rounded-full border border-[#c89b3c]/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🏛️</span>
                </div>
                <p className="text-foreground/60 mb-1">Nothing here yet.</p>
                <p className="text-sm text-muted-foreground">The thief has a proposal waiting on the map.</p>
              </div>
            ) : (
              <>
                <div className="bg-card/60 border border-[#c89b3c]/20 rounded-2xl p-4 mb-6 mt-4 fade-in-up">
                  <p className="text-xs text-[#c89b3c]/70 uppercase tracking-wider font-semibold mb-1">Thief's Commentary</p>
                  <p className="text-sm text-foreground/75 italic leading-relaxed">
                    "Every piece in here was earned fair and square — on my terms, by your knowledge.
                    I don't give these away to just anyone. Consider yourself... impressive."
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {state.collection.map((a, i) => <CollectionCard key={`${a.name}-${i}`} artifact={a} index={i} />)}
                </div>
              </>
            )}
          </div>
          <BanterSidebar
            banterLines={banterLines}
            thiefClass={state.collection.length > 0 ? "scale-110" : ""}
            guardianClass={state.collection.length > 0 ? "opacity-60" : ""}
          />
        </div>
      )}
    </div>
  );
};

export default Index;