import { useState, useCallback } from "react";
import type { ArtifactResult, DossierResult, QuestionResult, Museum } from "@/lib/api";

export type GamePhase = "home" | "map" | "museum-select" | "artifact-select" | "dossier" | "heist" | "victory" | "defeat" | "collection";

export interface CollectedArtifact {
  name: string;
  museum: string;
  region: string;
  rarity: "Common" | "Rare" | "Legendary";
  shortDescription: string;
  era: string;
  collectedAt: number;
}

export interface GameState {
  phase: GamePhase;
  selectedRegion: string;
  selectedMuseum: Museum | null;
  artifacts: ArtifactResult[];
  selectedArtifact: ArtifactResult | null;
  dossier: DossierResult | null;
  questions: QuestionResult[];
  currentQuestionIndex: number;
  lives: number;
  score: number;
  collection: CollectedArtifact[];
  loading: boolean;
  loadingMessage: string;
}

const loadCollection = (): CollectedArtifact[] => {
  try {
    return JSON.parse(localStorage.getItem("artheist-collection") || "[]");
  } catch {
    return [];
  }
};

const saveCollection = (c: CollectedArtifact[]) => {
  localStorage.setItem("artheist-collection", JSON.stringify(c));
};

const INITIAL: GameState = {
  phase: "home",
  selectedRegion: "",
  selectedMuseum: null,
  artifacts: [],
  selectedArtifact: null,
  dossier: null,
  questions: [],
  currentQuestionIndex: 0,
  lives: 2,
  score: 0,
  collection: loadCollection(),
  loading: false,
  loadingMessage: "",
};

export function useArtHeistState() {
  const [state, setState] = useState<GameState>(INITIAL);

  const update = useCallback((u: Partial<GameState>) => {
    setState((p) => ({ ...p, ...u }));
  }, []);

  const addToCollection = useCallback((artifact: ArtifactResult, region: string) => {
    setState((p) => {
      const item: CollectedArtifact = {
        name: artifact.name,
        museum: artifact.museum,
        region,
        rarity: artifact.rarity,
        shortDescription: artifact.shortDescription,
        era: artifact.era,
        collectedAt: Date.now(),
      };
      const newCollection = [...p.collection, item];
      saveCollection(newCollection);
      return { ...p, collection: newCollection, phase: "victory" as GamePhase, score: p.score + (artifact.rarity === "Legendary" ? 300 : artifact.rarity === "Rare" ? 200 : 100) };
    });
  }, []);

  const reset = useCallback(() => {
    setState({ ...INITIAL, collection: loadCollection() });
  }, []);

  return { state, update, addToCollection, reset };
}
