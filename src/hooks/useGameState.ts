import { useState, useCallback } from "react";
import { Artifact, ARTIFACTS } from "@/lib/artifacts";

export type GamePhase = "intro" | "selecting" | "dossier" | "playing" | "victory" | "gameover";

export interface QuestionData {
  question: string;
  options: string[];
  correct: number;
  fact: string;
  source: string;
  niaSource?: string;
}

export interface GameState {
  phase: GamePhase;
  selectedArtifact: Artifact | null;
  artifactIndex: number;
  stealthMeter: number;
  ninjaPosition: number;
  score: number;
  questionsAnswered: number;
  correctAnswers: number;
  currentQuestion: QuestionData | null;
  scholarMessage: string;
  isAlarm: boolean;
  dossier: string;
  difficulty: "easy" | "medium" | "hard";
  artifactsProtected: number;
  bonusFact: string;
}

const INITIAL_STATE: GameState = {
  phase: "intro",
  selectedArtifact: null,
  artifactIndex: 0,
  stealthMeter: 100,
  ninjaPosition: 0,
  score: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  currentQuestion: null,
  scholarMessage: "",
  isAlarm: false,
  dossier: "",
  difficulty: "medium",
  artifactsProtected: 0,
  bonusFact: "",
};

export function useGameState() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);

  const updateState = useCallback((updates: Partial<GameState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const startGame = useCallback(() => {
    updateState({ phase: "selecting" });
  }, [updateState]);

  const selectArtifact = useCallback((artifact: Artifact) => {
    updateState({
      selectedArtifact: artifact,
      phase: "dossier",
      stealthMeter: 100,
      ninjaPosition: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      currentQuestion: null,
      scholarMessage: "The shadows stir... prepare yourself, scholar.",
      isAlarm: false,
      bonusFact: "",
    });
  }, [updateState]);

  const startPlaying = useCallback(() => {
    updateState({ phase: "playing" });
  }, [updateState]);

  const answerCorrect = useCallback(() => {
    setState((prev) => {
      const newNinjaPos = Math.max(0, prev.ninjaPosition - 20);
      const newCorrect = prev.correctAnswers + 1;
      const newAnswered = prev.questionsAnswered + 1;

      if (newCorrect >= 5) {
        const newProtected = prev.artifactsProtected + 1;
        if (newProtected >= 5) {
          return {
            ...prev,
            ninjaPosition: newNinjaPos,
            correctAnswers: newCorrect,
            questionsAnswered: newAnswered,
            score: prev.score + 200,
            scholarMessage: "All artifacts secured! The museum is safe!",
            artifactsProtected: newProtected,
            phase: "victory",
          };
        }
        return {
          ...prev,
          ninjaPosition: newNinjaPos,
          correctAnswers: newCorrect,
          questionsAnswered: newAnswered,
          score: prev.score + 200,
          scholarMessage: "Artifact secured! On to the next one!",
          artifactsProtected: newProtected,
          phase: "selecting",
          artifactIndex: prev.artifactIndex + 1,
        };
      }

      return {
        ...prev,
        ninjaPosition: newNinjaPos,
        correctAnswers: newCorrect,
        questionsAnswered: newAnswered,
        score: prev.score + 100,
        scholarMessage: "Excellent! The ninja retreats into the shadows!",
      };
    });
  }, []);

  const answerWrong = useCallback(() => {
    setState((prev) => {
      const newStealth = prev.stealthMeter - 20;
      const newNinjaPos = Math.min(100, prev.ninjaPosition + 25);
      const newAnswered = prev.questionsAnswered + 1;

      if (newStealth <= 0 || newNinjaPos >= 100) {
        return {
          ...prev,
          stealthMeter: Math.max(0, newStealth),
          ninjaPosition: newNinjaPos,
          questionsAnswered: newAnswered,
          isAlarm: true,
          scholarMessage: "The ninja has stolen the artifact! All is lost!",
          phase: "gameover",
        };
      }

      return {
        ...prev,
        stealthMeter: newStealth,
        ninjaPosition: newNinjaPos,
        questionsAnswered: newAnswered,
        isAlarm: true,
        scholarMessage: "Wrong answer! The alarms blare! The ninja advances!",
      };
    });
  }, []);

  const clearAlarm = useCallback(() => {
    updateState({ isAlarm: false });
  }, [updateState]);

  const resetGame = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    state,
    updateState,
    startGame,
    selectArtifact,
    startPlaying,
    answerCorrect,
    answerWrong,
    clearAlarm,
    resetGame,
  };
}
