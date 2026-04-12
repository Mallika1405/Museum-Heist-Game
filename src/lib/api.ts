const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface ArtifactResult {
  name: string;
  museum: string;
  shortDescription: string;
  era: string;
  resultCount: number;
  rarity: "Common" | "Rare" | "Legendary";
}

export interface DossierResult {
  dossier: string;
  realTheftFound: boolean;
  theftSummary?: string;
  niaSource: string;
}

export interface QuestionResult {
  question: string;
  options: string[];
  correct: number;
  fact: string;
  source: string;
  niaSource?: string;
}

export interface Museum {
  name: string;
  city: string;
  country: string;
  emoji: string;
  lat: number;
  lng: number;
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

export async function searchArtifacts(regionName: string, museumName?: string): Promise<ArtifactResult[]> {
  const data = await post("/api/search-artifacts", { regionName, museumName });
  return data?.artifacts || [];
}

export async function fetchDossier(artifactName: string, museum: string): Promise<DossierResult> {
  const data = await post("/api/generate-question", { artifactName, museumName: museum, museumDomain: "wikipedia.org", mode: "dossier" });

  let realTheftFound = false;
  let theftSummary = "";
  try {
    const theftData = await post("/api/generate-question", { artifactName, museumName: museum, museumDomain: "wikipedia.org", mode: "bonus-fact" });
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
  };
}

export async function fetchQuestions(artifactName: string, museum: string, difficulty: string): Promise<QuestionResult[]> {
  const questions: QuestionResult[] = [];
  const previousQuestions: string[] = [];
  for (let i = 0; i < 3; i++) {
    const data = await post("/api/generate-question", {
      artifactName, museumName: museum, museumDomain: "wikipedia.org", difficulty, questionNumber: i + 1, totalQuestions: 3, previousQuestions,
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
