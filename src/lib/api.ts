const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface SourceInfo {
  badge: string;   // emoji: 📚 🏛️ 📰 🌐
  label: string;   // "Academic" | "Official Museum" | "Press" | "Web"
  type: string;    // "academic" | "museum" | "news" | "web"
}

export interface ArtifactResult {
  name: string;
  museum: string;
  shortDescription: string;
  era: string;
  niaResultCount: number;
  rarity: "Common" | "Rare" | "Legendary";
  sourceInfo?: SourceInfo;
}

export interface DossierResult {
  dossier: string;
  realTheftFound: boolean;
  theftSummary?: string;
  niaSource: string;
  sourceInfo?: SourceInfo;
}

export interface QuestionResult {
  question: string;
  options: string[];
  correct: number;
  fact: string;
  source: string;
  niaSource?: string;
  sourceInfo?: SourceInfo;
}

export interface Museum {
  name: string;
  city: string;
  country: string;
  emoji: string;
  lat: number;
  lng: number;
}

export interface CharacterLines {
  guardian: string;
  thief: string;
}

export interface ControversyResult {
  controversyScore: number;
  summary: string;
  niaResultCount: number;
  keywordsFound: string[];
  isHot: boolean;
}

export interface DailyHeist {
  artifactName: string;
  museum: string;
  era: string;
  shortDescription: string;
  heistBriefing: string;
  difficulty: "easy" | "medium" | "hard";
  newsHook: string;
  date: string;
  niaResultCount: number;
  niaUsed: boolean;
}

export interface ArtifactTrail {
  region: string;
  lat: number;
  lng: number;
  connection: string;
  niaResultCount: number;
}

async function post(path: string, body: any) {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

export async function searchArtifacts(
  regionName: string,
  museumName?: string
): Promise<{ artifacts: ArtifactResult[]; deadZone: boolean }> {
  const data = await post("/api/search-artifacts", { regionName, museumName });
  return { artifacts: data?.artifacts || [], deadZone: data?.deadZone ?? false };
}

export async function fetchDossier(artifactName: string, museum: string): Promise<DossierResult> {
  const data = await post("/api/generate-question", {
    artifactName, museumName: museum, museumDomain: "wikipedia.org", mode: "dossier",
  });

  let realTheftFound = false;
  let theftSummary = "";
  try {
    const theftData = await post("/api/generate-question", {
      artifactName, museumName: museum, museumDomain: "wikipedia.org", mode: "bonus-fact",
    });
    if (theftData?.fact) {
      theftSummary = theftData.fact;
      realTheftFound = theftSummary.toLowerCase().includes("stolen") ||
        theftSummary.toLowerCase().includes("theft") ||
        theftSummary.toLowerCase().includes("heist");
    }
  } catch {}

  return {
    dossier: data?.dossier || "Intel corrupted. Proceed with caution.",
    realTheftFound,
    theftSummary,
    niaSource: data?.niaSource || "unknown",
    sourceInfo: data?.sourceInfo,
  };
}

export async function fetchQuestions(
  artifactName: string,
  museum: string,
  difficulty: string
): Promise<QuestionResult[]> {
  const questions: QuestionResult[] = [];
  const previousQuestions: string[] = [];
  for (let i = 0; i < 3; i++) {
    const data = await post("/api/generate-question", {
      artifactName, museumName: museum, museumDomain: "wikipedia.org",
      difficulty, questionNumber: i + 1, totalQuestions: 3, previousQuestions,
    });
    questions.push(data as QuestionResult);
    previousQuestions.push((data as QuestionResult).question);
  }
  return questions;
}

export async function fetchMuseums(): Promise<Museum[]> {
  const data = await post("/api/search-museums", {});
  return data?.museums || [];
}

export async function fetchCharacterLines(
  artifactName: string,
  museumName: string,
  thiefPersonality: string = "sarcastic"
): Promise<CharacterLines> {
  try {
    return await post("/api/character-lines", { artifactName, museumName, thiefPersonality });
  } catch {
    return { guardian: "These artifacts are under my protection!", thief: "I'll take the legendary one... 😏" };
  }
}

export async function fetchControversy(
  artifactName: string,
  museumName: string
): Promise<ControversyResult> {
  try {
    return await post("/api/controversy", { artifactName, museumName });
  } catch {
    return { controversyScore: 0, summary: "Controversy data unavailable.", niaResultCount: 0, keywordsFound: [], isHot: false };
  }
}

export async function fetchDailyHeist(): Promise<DailyHeist | null> {
  try {
    return await post("/api/daily-heist", {});
  } catch {
    return null;
  }
}

// Feature 7: Artifact Trail
export async function fetchArtifactTrail(
  artifactName: string,
  currentRegion: string
): Promise<ArtifactTrail | null> {
  try {
    return await post("/api/artifact-trail", { artifactName, currentRegion });
  } catch {
    return null;
  }
}

// Feature 10: Dead Zone Message
export async function fetchDeadZoneMessage(
  regionName: string,
  thiefPersonality: string = "sarcastic"
): Promise<string> {
  try {
    const data = await post("/api/dead-zone", { regionName, thiefPersonality });
    return data?.message || "Not even I would bother with this place.";
  } catch {
    return "Not even I would bother with this place.";
  }
}