import { useState, useRef, useEffect } from "react";
import { useArtHeistState } from "@/hooks/useArtHeistState";
import { searchArtifacts, fetchDossier, fetchQuestions } from "@/lib/api";
import type { ArtifactResult, Museum } from "@/lib/api";
import guardianImg from "@/assets/guardian.png";
import thiefImg from "@/assets/thief-new.png";
import { toast } from "sonner";
import WorldMap from "@/components/WorldMap";

const FEATURED_MUSEUMS: Museum[] = [
  { name: "British Museum", city: "London", country: "UK", emoji: "🇬🇧", lat: 51.5194, lng: -0.1270 },
  { name: "The Metropolitan Museum of Art", city: "New York", country: "USA", emoji: "🇺🇸", lat: 40.7794, lng: -73.9632 },
  { name: "Louvre Museum", city: "Paris", country: "France", emoji: "🇫🇷", lat: 48.8606, lng: 2.3376 },
  { name: "Egyptian Museum", city: "Cairo", country: "Egypt", emoji: "🇪🇬", lat: 30.0478, lng: 31.2336 },
  { name: "National Museum of China", city: "Beijing", country: "China", emoji: "🇨🇳", lat: 39.9054, lng: 116.3976 },
];

const RARITY_COLORS = {
  Common: { badge: "bg-gray-500", border: "border-gray-400", glow: "" },
  Rare: { badge: "bg-blue-500", border: "border-blue-400", glow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]" },
  Legendary: { badge: "bg-yellow-500", border: "border-yellow-400", glow: "shadow-[0_0_20px_rgba(234,179,8,0.6)]" },
};

const NiaLoader = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center gap-4 py-12">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 border-4 border-primary/30 rounded-full" />
      <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="absolute inset-0 flex items-center justify-center text-2xl">🔍</span>
    </div>
    <p className="text-primary font-semibold text-sm animate-pulse">{message}</p>
  </div>
);

const ArtifactCard = ({ artifact, onClick, index }: { artifact: ArtifactResult; onClick: () => void; index: number }) => {
  const rc = RARITY_COLORS[artifact.rarity];
  return (
    <button
      onClick={onClick}
      className={`bg-card border-2 ${rc.border} ${rc.glow} rounded-2xl p-5 text-left hover:scale-105 transition-all duration-300 group animate-[dealIn_0.5s_ease-out_forwards] opacity-0`}
      style={{ animationDelay: `${index * 0.15}s` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`${rc.badge} text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider`}>
          {artifact.rarity}
        </span>
        <span className="text-xs text-muted-foreground">{artifact.era}</span>
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1 group-hover:text-primary/80 transition-colors">
        {artifact.name}
      </h3>
      <p className="text-sm text-muted-foreground mb-2">{artifact.museum}</p>
      <p className="text-xs text-foreground/60 leading-relaxed">{artifact.shortDescription}</p>
      {artifact.rarity === "Legendary" && (
        <div className="mt-3 h-0.5 bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 rounded animate-pulse" />
      )}
    </button>
  );
};

const CollectionCard = ({ artifact }: { artifact: any }) => {
  const rc = RARITY_COLORS[artifact.rarity as keyof typeof RARITY_COLORS];
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouse = (e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(600px) rotateY(${x * 20}deg) rotateX(${-y * 20}deg) scale(1.05)`;
  };

  const handleLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = "";
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      className={`bg-card border-2 ${rc.border} ${rc.glow} rounded-2xl p-4 transition-transform duration-200 cursor-default`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`${rc.badge} text-white text-xs font-semibold px-2 py-0.5 rounded-full`}>
          {artifact.rarity}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-primary mb-1">{artifact.name}</h3>
      <p className="text-xs text-muted-foreground">{artifact.museum}</p>
      <p className="text-xs text-foreground/50 mt-1 leading-relaxed">{artifact.shortDescription}</p>
      <p className="text-xs text-muted-foreground mt-2">{artifact.region} • {artifact.era}</p>
    </div>
  );
};

/* ─── HOME SCREEN ─── */
const HomeScreen = ({ onStart, onCollection, collectionCount }: { onStart: () => void; onCollection: () => void; collectionCount: number }) => {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(true); }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className={`flex flex-col items-center transition-all duration-1000 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {/* Logo */}
        <div className="text-6xl mb-4 scale-in" style={{ animationDelay: "0.2s" }}>🏛️</div>
        <h1 className="text-5xl md:text-7xl font-bold shimmer-text mb-2 tracking-tight">ArtHeist</h1>
        <p className="text-muted-foreground text-center max-w-md mb-8 text-base leading-relaxed">
          Explore world museums, discover real artifacts, and answer questions to steal them for your collection.
        </p>

        {/* Characters */}
          <div className="flex items-end gap-12 mb-10">
          <div className="flex flex-col items-center fade-in-up" style={{ animationDelay: "0.4s" }}>
            <img src={guardianImg} alt="Guardian" className="w-40 h-40 md:w-52 md:h-52 object-contain float-animate drop-shadow-2xl" />
            <span className="text-xs text-muted-foreground mt-2">The Guardian</span>
          </div>
          <div className="text-3xl font-bold text-primary fade-in-up" style={{ animationDelay: "0.6s" }}>VS</div>
          <div className="flex flex-col items-center fade-in-up" style={{ animationDelay: "0.8s" }}>
            <img src={thiefImg} alt="Thief" className="w-40 h-40 md:w-52 md:h-52 object-contain float-animate drop-shadow-2xl" style={{ animationDelay: "1.5s" }} />
            <span className="text-xs text-muted-foreground mt-2">The Thief</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 fade-in-up" style={{ animationDelay: "1s" }}>
          <button
            onClick={onStart}
            className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg tracking-wide hover:brightness-110 transition-all pulse-glow hover:scale-105"
          >
            🗺️ Start Heist
          </button>
          {collectionCount > 0 && (
            <button
              onClick={onCollection}
              className="px-6 py-4 bg-secondary text-foreground rounded-2xl font-semibold hover:bg-secondary/80 transition-all hover:scale-105"
            >
              🃏 Collection ({collectionCount})
            </button>
          )}
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-8 fade-in-up" style={{ animationDelay: "1.2s" }}>
          {["🌍 Real Museums", "🔍 AI-Powered", "🃏 Collectible Cards", "📡 Live Data"].map((f) => (
            <span key={f} className="px-3 py-1.5 bg-card border border-border rounded-full text-xs text-muted-foreground">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full particle"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: "0",
              width: 2 + Math.random() * 4,
              height: 2 + Math.random() * 4,
              background: "hsl(43 72% 55% / 0.3)",
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
              animationIterationCount: "infinite",
            }}
          />
        ))}
      </div>
    </div>
  );
};

const Index = () => {
  const { state, update, addToCollection, reset } = useArtHeistState();
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [clickedPos, setClickedPos] = useState<[number, number] | null>(null);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
      const data = await resp.json();
      return data.address?.country || data.address?.state || "Unknown Region";
    } catch {
      return "Unknown Region";
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setClickedPos([lat, lng]);
    update({ loading: true, loadingMessage: "NIA is searching this region..." });
    const region = await reverseGeocode(lat, lng);
    update({ selectedRegion: region, loadingMessage: `NIA is searching ${region}...` });
    try {
      const artifacts = await searchArtifacts(region);
      update({ artifacts, phase: "artifact-select", loading: false });
    } catch {
      toast.error("Search failed. Try another location!");
      update({ loading: false });
    }
  };

  const handleMuseumSelect = async (museum: Museum) => {
    update({ selectedMuseum: museum, loading: true, loadingMessage: `NIA is searching ${museum.name}...`, selectedRegion: `${museum.city}, ${museum.country}` });
    try {
      const artifacts = await searchArtifacts(museum.city, museum.name);
      update({ artifacts, phase: "artifact-select", loading: false });
    } catch {
      toast.error("Search failed. Try again!");
      update({ loading: false });
    }
  };

  const handleArtifactSelect = async (artifact: ArtifactResult) => {
    update({ selectedArtifact: artifact, phase: "dossier", loading: true, loadingMessage: "NIA is compiling the dossier..." });
    try {
      const dossier = await fetchDossier(artifact.name, artifact.museum);
      update({ dossier, loading: false });
    } catch {
      update({ dossier: { dossier: "Intel corrupted.", realTheftFound: false, niaSource: "unknown" }, loading: false });
    }
  };

  const handleBeginHeist = async () => {
    if (!state.selectedArtifact) return;
    update({ phase: "heist", loading: true, loadingMessage: "NIA is preparing the heist questions...", currentQuestionIndex: 0, lives: 2 });
    const difficulty = state.selectedArtifact.rarity === "Common" ? "easy" : state.selectedArtifact.rarity === "Rare" ? "medium" : "hard";
    try {
      const questions = await fetchQuestions(state.selectedArtifact.name, state.selectedArtifact.museum, difficulty);
      update({ questions, loading: false });
    } catch {
      toast.error("Failed to load questions.");
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
        setTimeout(() => update({ phase: "defeat" }), 1500);
        return;
      }
    }
    setTimeout(() => {
      setAnswered(false);
      setLastCorrect(null);
      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex >= state.questions.length) {
        addToCollection(state.selectedArtifact!, state.selectedRegion);
      } else {
        update({ currentQuestionIndex: nextIndex });
      }
    }, 1800);
  };

  const goToMap = () => {
    update({ phase: "map", artifacts: [], selectedArtifact: null, dossier: null, questions: [], currentQuestionIndex: 0, lives: 2, loading: false });
    setAnswered(false);
    setLastCorrect(null);
    setClickedPos(null);
  };

  /* ─── HOME ─── */
  if (state.phase === "home") {
    return (
      <HomeScreen
        onStart={() => update({ phase: "map" })}
        onCollection={() => update({ phase: "collection" })}
        collectionCount={state.collection.length}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Scanline */}
      <div className="scanline-overlay" />

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full particle"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: "0",
              width: 3 + Math.random() * 3,
              height: 3 + Math.random() * 3,
              background: "hsl(43 72% 55% / 0.4)",
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
              animationIterationCount: "infinite",
            }}
          />
        ))}
      </div>

      {/* Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => update({ phase: "home" })} className="flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-2xl">🏛️</span>
            <h1 className="text-xl font-bold shimmer-text tracking-wider">ArtHeist</h1>
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Score: <span className="text-primary font-semibold">{state.score}</span></span>
            <button
              onClick={() => update({ phase: "collection" })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition text-sm"
            >
              🃏 <span className="text-foreground">{state.collection.length}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Loading overlay */}
      {state.loading && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur flex items-center justify-center">
          <NiaLoader message={state.loadingMessage} />
        </div>
      )}

      {/* MAP SCREEN */}
      {(state.phase === "map" || state.phase === "museum-select") && !state.loading && (
        <div className="pt-16 h-screen flex flex-col">
          <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto bg-card/50">
            <span className="text-xs text-muted-foreground whitespace-nowrap mr-2">Quick pick:</span>
            {FEATURED_MUSEUMS.map((m) => (
              <button
                key={m.name}
                onClick={() => handleMuseumSelect(m)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full hover:bg-primary hover:text-primary-foreground transition text-xs whitespace-nowrap shrink-0"
              >
                <span>{m.emoji}</span>
                <span>{m.name}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <WorldMap
              museums={FEATURED_MUSEUMS}
              clickedPos={clickedPos}
              onMapClick={handleMapClick}
              onMuseumSelect={handleMuseumSelect}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur rounded-xl px-6 py-3 border border-border z-[1000]">
              <p className="text-sm text-center text-foreground/80">
                🗺️ Click anywhere on the map or pick a museum above to start a heist!
              </p>
            </div>
            <div className="absolute bottom-20 left-4 z-[1000]">
              <img src={guardianImg} alt="Guardian" className="w-32 h-32 object-contain float-animate drop-shadow-lg" />
            </div>
            <div className="absolute bottom-20 right-4 z-[1000]">
              <img src={thiefImg} alt="Thief" className="w-32 h-32 object-contain float-animate drop-shadow-lg" style={{ animationDelay: "1.5s" }} />
            </div>
          </div>
        </div>
      )}

      {/* ARTIFACT SELECT */}
      {state.phase === "artifact-select" && !state.loading && (
        <div className="pt-20 min-h-screen flex flex-col items-center px-4 pb-8">
          <div className="mb-8 text-center fade-in-up">
            <h2 className="text-2xl font-bold text-primary mb-2">Artifacts Found!</h2>
            <p className="text-muted-foreground text-sm">Region: {state.selectedRegion}</p>
            <p className="text-xs text-muted-foreground mt-1">Choose an artifact to steal for your collection</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
            {state.artifacts.map((a, i) => (
              <ArtifactCard key={a.name} artifact={a} index={i} onClick={() => handleArtifactSelect(a)} />
            ))}
          </div>
          <button onClick={goToMap} className="mt-6 text-sm text-muted-foreground hover:text-foreground transition">
            ← Back to map
          </button>
          <div className="fixed bottom-4 left-4 z-30">
            <img src={guardianImg} alt="Guardian" className="w-28 h-28 object-contain float-animate drop-shadow-lg" />
            <div className="bg-card border border-border rounded-lg rounded-bl-none px-3 py-2 mt-1 max-w-[200px] speech-pop">
              <p className="text-xs text-foreground">These artifacts are under my protection!</p>
            </div>
          </div>
          <div className="fixed bottom-4 right-4 z-30">
            <img src={thiefImg} alt="Thief" className="w-28 h-28 object-contain float-animate drop-shadow-lg" style={{ animationDelay: "1s" }} />
            <div className="bg-card border border-border rounded-lg rounded-br-none px-3 py-2 mt-1 max-w-[200px] speech-pop" style={{ animationDelay: "0.5s" }}>
              <p className="text-xs text-foreground">I'll take the legendary one... 😏</p>
            </div>
          </div>
        </div>
      )}

      {/* DOSSIER */}
      {state.phase === "dossier" && state.selectedArtifact && !state.loading && (
        <div className="pt-20 min-h-screen flex items-center justify-center px-4">
          <div className="bg-card border-2 border-border rounded-2xl p-8 max-w-lg w-full relative overflow-hidden fade-in-up">
            <div className="absolute top-4 right-4 rotate-12 border-2 border-destructive text-destructive text-xs font-semibold px-3 py-1 rounded opacity-60">
              TOP SECRET
            </div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📋</span>
              <div>
                <h2 className="text-xl font-bold text-primary">HEIST BRIEFING</h2>
                <p className="text-xs text-muted-foreground">Classified Intelligence Report</p>
              </div>
            </div>
            <div className={`inline-block ${RARITY_COLORS[state.selectedArtifact.rarity].badge} text-white text-xs font-semibold px-3 py-1 rounded-full mb-4`}>
              {state.selectedArtifact.rarity}
            </div>
            <h3 className="text-lg font-semibold text-primary mb-1">{state.selectedArtifact.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{state.selectedArtifact.museum} • {state.selectedArtifact.era}</p>
            
            <div className="bg-secondary/50 rounded-xl p-4 mb-4 border border-border">
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                "{state.dossier?.dossier?.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#+\s/g, '')}"
              </p>
            </div>

            {state.dossier?.realTheftFound && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4 animate-pulse">
                <p className="text-xs font-semibold text-destructive mb-1">🚨 REAL HEIST RECORDED</p>
                <p className="text-xs text-foreground/70">{state.dossier.theftSummary}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground mb-6 italic">
              📡 Intel sourced via NIA from {state.dossier?.niaSource}
            </p>

            <div className="flex gap-3">
              <button onClick={goToMap} className="px-4 py-2.5 bg-secondary text-foreground rounded-xl text-sm hover:bg-secondary/80 transition">
                Abort
              </button>
              <button
                onClick={handleBeginHeist}
                className="flex-1 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold tracking-wider hover:brightness-110 transition pulse-glow"
              >
                🎯 BEGIN HEIST
              </button>
            </div>

            <div className="flex justify-between mt-6">
              <img src={guardianImg} alt="Guardian" className="w-20 h-20 object-contain" />
              <img src={thiefImg} alt="Thief" className="w-20 h-20 object-contain animate-[bounce_1s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>
      )}

      {/* HEIST (Questions) */}
      {state.phase === "heist" && !state.loading && (
        <div className="pt-20 min-h-screen flex flex-col items-center px-4 pb-8">
          <div className="w-full max-w-lg mb-6 fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-primary text-sm">{state.selectedArtifact?.name}</h2>
              <div className="flex items-center gap-2">
                {Array.from({ length: 2 }, (_, i) => (
                  <span key={i} className={`text-lg transition-transform duration-300 ${i >= state.lives ? "scale-75 grayscale" : ""}`}>
                    {i < state.lives ? "❤️" : "🖤"}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {state.questions.map((_, i) => (
                <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                  i < state.currentQuestionIndex ? "bg-green-500" : i === state.currentQuestionIndex ? "bg-primary" : "bg-secondary"
                }`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Question {state.currentQuestionIndex + 1} of {state.questions.length}</p>
          </div>

          {state.questions[state.currentQuestionIndex] && (
            <div className="w-full max-w-lg scale-in">
              <div className="bg-card border-2 border-border rounded-2xl p-6 mb-4">
                <h3 className="text-lg font-semibold text-primary mb-6 leading-relaxed">
                  {state.questions[state.currentQuestionIndex].question}
                </h3>
                <div className="grid gap-3">
                  {state.questions[state.currentQuestionIndex].options.map((opt, i) => {
                    let btnClass = "bg-secondary hover:bg-primary hover:text-primary-foreground";
                    if (answered) {
                      if (i === state.questions[state.currentQuestionIndex].correct) {
                        btnClass = "bg-green-600 text-white scale-[1.02]";
                      } else if (lastCorrect === false && i !== state.questions[state.currentQuestionIndex].correct) {
                        btnClass = "bg-secondary opacity-50";
                      }
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={answered}
                        className={`text-left px-5 py-3.5 rounded-xl border border-border ${btnClass} transition-all duration-300 text-sm disabled:cursor-not-allowed`}
                      >
                        <span className="font-semibold text-primary mr-2">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {state.questions[state.currentQuestionIndex].niaSource && (
                  <p className="text-xs text-muted-foreground mt-4 italic">📡 {state.questions[state.currentQuestionIndex].niaSource}</p>
                )}
              </div>

              {answered && lastCorrect !== null && (
                <div className={`text-center py-3 rounded-xl mb-4 font-semibold ${
                  lastCorrect ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"
                } fade-in-up`}>
                  {lastCorrect ? "✅ Correct! The guardian holds strong!" : "❌ Wrong! The thief advances!"}
                </div>
              )}

              {answered && state.questions[state.currentQuestionIndex].fact && (
                <div className="text-center text-xs text-primary/70 italic bg-card/50 rounded-xl py-2 px-4 fade-in-up" style={{ animationDelay: "0.2s" }}>
                  💡 {state.questions[state.currentQuestionIndex].fact}
                </div>
              )}
            </div>
          )}

          <div className="fixed bottom-4 left-4 z-30">
            <img src={guardianImg} alt="Guardian" className={`w-32 h-32 object-contain drop-shadow-lg transition-all duration-500 ${lastCorrect === true ? "scale-110 wiggle" : ""}`} />
          </div>
          <div className="fixed bottom-4 right-4 z-30">
            <img
              src={thiefImg}
              alt="Thief"
              className={`w-32 h-32 object-contain drop-shadow-lg transition-all duration-500 ${
                lastCorrect === false ? "translate-x-[-30px] scale-110" : lastCorrect === true ? "translate-x-[20px] scale-90 opacity-70" : ""
              }`}
            />
          </div>
        </div>
      )}

      {/* VICTORY */}
      {state.phase === "victory" && (
        <div className="pt-20 min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <div className="fade-in-up">
            <div className="text-6xl mb-4 scale-in">🎉</div>
            <h1 className="text-3xl font-bold shimmer-text mb-2">Artifact Secured!</h1>
            <p className="text-foreground/70 mb-2">You've added <span className="text-primary font-semibold">{state.selectedArtifact?.name}</span> to your collection!</p>
            <div className={`inline-block ${RARITY_COLORS[state.selectedArtifact?.rarity || "Common"].badge} text-white text-xs font-semibold px-3 py-1 rounded-full mb-6`}>
              {state.selectedArtifact?.rarity}
            </div>
            <div className="flex justify-center gap-6 mb-8">
              <img src={guardianImg} alt="Guardian" className="w-32 h-32 object-contain float-animate drop-shadow-2xl" />
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={goToMap} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 transition hover:scale-105">
                🗺️ New Heist
              </button>
              <button onClick={() => update({ phase: "collection" })} className="px-6 py-3 bg-secondary text-foreground rounded-xl font-semibold hover:bg-secondary/80 transition hover:scale-105">
                🃏 View Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEFEAT */}
      {state.phase === "defeat" && (
        <div className="pt-20 min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <div className="fade-in-up">
            <div className="text-6xl mb-4 scale-in">😈</div>
            <h1 className="text-3xl font-bold text-destructive mb-2">The Thief Got Away!</h1>
            <p className="text-foreground/70 mb-6">
              The thief escaped with <span className="font-semibold">{state.selectedArtifact?.name}</span>. Better luck next time!
            </p>
            <div className="flex justify-center gap-6 mb-8">
              <img src={thiefImg} alt="Thief" className="w-32 h-32 object-contain float-animate drop-shadow-2xl" />
            </div>
            <button onClick={goToMap} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 transition hover:scale-105">
              🗺️ Try Again
            </button>
          </div>
        </div>
      )}

      {/* COLLECTION */}
      {state.phase === "collection" && (
        <div className="pt-20 min-h-screen px-4 pb-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6 fade-in-up">
              <div>
                <h2 className="text-2xl font-bold text-primary">Your Collection</h2>
                <p className="text-sm text-muted-foreground">{state.collection.length} artifact{state.collection.length !== 1 ? "s" : ""} collected</p>
              </div>
              <button onClick={goToMap} className="px-4 py-2 bg-secondary rounded-xl text-sm hover:bg-secondary/80 transition">
                ← Back to Map
              </button>
            </div>
            {state.collection.length === 0 ? (
              <div className="text-center py-20 fade-in-up">
                <div className="text-5xl mb-4">🏛️</div>
                <p className="text-muted-foreground">No artifacts collected yet.</p>
                <p className="text-sm text-muted-foreground mt-1">Click the map to start your first heist!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {state.collection.map((a, i) => (
                  <CollectionCard key={`${a.name}-${i}`} artifact={a} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
