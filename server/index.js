import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const { GEMINI_API_KEY, NIA_API_KEY } = process.env;

async function callLLM(prompt) {
  if (GEMINI_API_KEY) {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (resp.ok) {
      const data = await resp.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
    console.error("Gemini failed:", resp.status);
  }
  throw new Error("LLM provider failed — check your GEMINI_API_KEY");
}

async function niaSearch(query) {
  if (!NIA_API_KEY) { console.warn('[NIA] NIA_API_KEY not set'); return []; }

  const attempts = [
    // universal-search endpoint (different endpoint entirely)
    { url: 'https://apigcp.trynia.ai/v2/universal-search', body: { query } },
    { url: 'https://apigcp.trynia.ai/v2/universal-search', body: { query, search_mode: 'unified' } },
    // search endpoint, every shape imaginable
    { url: 'https://apigcp.trynia.ai/v2/search', body: { mode: 'universal', query } },
    { url: 'https://apigcp.trynia.ai/v2/search', body: { mode: 'query', messages: [{ role: 'user', content: query }] } },
    { url: 'https://apigcp.trynia.ai/v2/search', body: { mode: 'deep', query } },
    { url: 'https://apigcp.trynia.ai/v2/search', body: { query } },
  ];

  for (const { url, body } of attempts) {
    try {
      console.log('[NIA] Trying', url.split('/v2/')[1], JSON.stringify(body).slice(0, 60));
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 15000);
      const resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${NIA_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (resp.ok) {
        const data = await resp.json();
        const results = data.results || data.items || data.data || data.chunks || [];
        console.log(`[NIA] ✅ Success with shape:`, JSON.stringify(body).slice(0, 60), `— ${results.length} results`);
        return results;
      }
      console.warn(`[NIA] ${resp.status}:`, (await resp.text()).slice(0, 120));
    } catch (e) {
      console.warn('[NIA] Error:', e.name === 'AbortError' ? 'timeout' : e.message);
    }
  }

  console.log('[NIA] All attempts failed');
  return [];
}

// ---------- SEARCH ARTIFACTS ----------
app.post("/api/search-artifacts", async (req, res) => {
  try {
    const { regionName, museumName } = req.body;
    const query = museumName
      ? `famous artifacts at ${museumName} museum collection highlights`
      : `famous museum artifacts from ${regionName} historical objects`;

    const niaResults = await niaSearch(query);
    let niaContext = niaResults
      .slice(0, 8)
      .map((r) => r.text || r.snippet || r.content || "")
      .join("\n");

    const prompt = `Based on the following search results about ${museumName ? `artifacts at ${museumName}` : `artifacts from ${regionName}`}, extract exactly 5 real museum artifacts. Return ONLY valid JSON array, no markdown:
[
  {"name": "artifact name", "museum": "museum name", "shortDescription": "one sentence description", "era": "time period", "resultCount": estimated_number_of_search_results}
]

The resultCount should reflect how famous the artifact is (more famous = higher count).

Search results:
${niaContext || `No search results available. Generate 5 real, historically accurate artifacts from ${museumName || regionName}.`}`;

    const rawText = await callLLM(prompt);
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    let artifacts;
    try {
      artifacts = JSON.parse(jsonStr);
    } catch {
      artifacts = [
        { name: "Ancient Vase", museum: museumName || "National Museum", shortDescription: "A beautifully crafted ceremonial vessel", era: "500 BC", resultCount: 30 },
        { name: "Bronze Figurine", museum: museumName || "National Museum", shortDescription: "A small but exquisite bronze statue", era: "200 AD", resultCount: 8 },
        { name: "Stone Tablet", museum: museumName || "National Museum", shortDescription: "An inscribed stone with ancient writing", era: "1000 BC", resultCount: 55 },
        { name: "Ivory Pendant", museum: museumName || "National Museum", shortDescription: "A delicately carved ornamental pendant", era: "300 AD", resultCount: 15 },
        { name: "Golden Chalice", museum: museumName || "National Museum", shortDescription: "A gilded ceremonial drinking cup", era: "700 AD", resultCount: 3 },
      ];
    }

    const withRarity = artifacts.map((a) => ({
      ...a,
      rarity: a.resultCount > 50 ? "Common" : a.resultCount >= 10 ? "Rare" : "Legendary",
    }));

    res.json({ artifacts: withRarity, niaUsed: niaResults.length > 0 });
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ---------- GENERATE QUESTION / DOSSIER ----------
app.post("/api/generate-question", async (req, res) => {
  try {
    const { artifactName, museumName, museumDomain, difficulty, mode, questionNumber, totalQuestions, previousQuestions } = req.body;

    const niaQuery = `${artifactName} ${museumName} history facts`;
    const niaResults = await niaSearch(niaQuery);
    let niaResultsStr = "";
    let niaSourceDomain = museumDomain || "unknown";

    if (niaResults.length > 0) {
      niaResultsStr = niaResults
        .slice(0, 5)
        .map((r) => `Source: ${r.url || r.source || "unknown"}\n${r.text || r.snippet || r.content || ""}`)
        .join("\n\n");
      const firstSource = niaResults[0];
      if (firstSource?.url) {
        try { niaSourceDomain = new URL(firstSource.url).hostname; } catch {}
      }
    }

    if (!niaResultsStr) {
      niaResultsStr = `The ${artifactName} is a famous artifact housed in the ${museumName}. It is one of the most significant historical objects in the world.`;
    }

    if (mode === "dossier") {
      const text = await callLLM(
        `Using the following museum data, write a short classified dossier (3-4 sentences) about the provenance and history of "${artifactName}" from ${museumName}. Write it as if it were an intercepted intelligence briefing. Be dramatic but factual. Do NOT use any markdown formatting like ** or * or # — write in plain text only.\n\nMuseum data:\n${niaResultsStr}`
      );
      return res.json({ dossier: text, niaSource: niaSourceDomain });
    }

    if (mode === "bonus-fact") {
      const text = await callLLM(
        `Using ONLY the following sourced museum data, provide one surprising and fascinating real fact about "${artifactName}" in exactly one sentence (max 25 words). No markdown.\n\nMuseum data:\n${niaResultsStr}`
      );
      return res.json({ fact: text, niaSource: niaSourceDomain });
    }

    // Question generation
    const difficultyInstruction = difficulty === "hard"
      ? "Make the question very challenging, about obscure details."
      : difficulty === "easy"
      ? "Make the question straightforward about well-known facts."
      : "Make the question moderately challenging.";

    const prevQStr = previousQuestions?.length > 0
      ? `\n\nIMPORTANT: Do NOT repeat or rephrase any of these previously asked questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\nAsk about a COMPLETELY DIFFERENT aspect of the artifact.`
      : "";

    const questionPrompt = `You are a museum historian AI. Using ONLY the following sourced museum data provided, generate exactly 1 multiple choice history question. This is question ${questionNumber || 1} of ${totalQuestions || 3} — each must cover a DIFFERENT aspect (e.g. origin, material, historical context, discovery, significance, dimensions, creator, location history). ${difficultyInstruction}${prevQStr} Return ONLY valid JSON, no markdown:
{
  "question": "string",
  "options": ["A","B","C","D"],
  "correct": 0,
  "fact": "one fascinating verified fact, max 20 words",
  "source": "museum name"
}
The correct field is the 0-based index of the correct answer.

Museum data about "${artifactName}" from ${museumName}:
${niaResultsStr}`;

    const rawText = await callLLM(questionPrompt);
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    let questionData;
    try {
      questionData = JSON.parse(jsonStr);
    } catch {
      questionData = {
        question: `What is the ${artifactName} known for?`,
        options: ["Its historical significance", "Its modern design", "Its digital creation", "Its fictional origin"],
        correct: 0,
        fact: `The ${artifactName} is housed in the ${museumName}.`,
        source: museumName,
      };
    }
    questionData.niaSource = `sourced via Nia from ${niaSourceDomain}`;

    res.json(questionData);
  } catch (e) {
    console.error("Function error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ---------- SEARCH MUSEUMS ----------
const FEATURED_MUSEUMS = [
  { name: "British Museum", city: "London", country: "UK", emoji: "🇬🇧", lat: 51.5194, lng: -0.1270 },
  { name: "The Metropolitan Museum of Art", city: "New York", country: "USA", emoji: "🇺🇸", lat: 40.7794, lng: -73.9632 },
  { name: "Louvre Museum", city: "Paris", country: "France", emoji: "🇫🇷", lat: 48.8606, lng: 2.3376 },
  { name: "Egyptian Museum", city: "Cairo", country: "Egypt", emoji: "🇪🇬", lat: 30.0478, lng: 31.2336 },
  { name: "National Museum of China", city: "Beijing", country: "China", emoji: "🇨🇳", lat: 39.9054, lng: 116.3976 },
];

app.post("/api/search-museums", async (_req, res) => {
  res.json({ museums: FEATURED_MUSEUMS });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🏛️  ArtHeist server running on http://localhost:${PORT}`));