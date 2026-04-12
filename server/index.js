import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const { GEMINI_API_KEY, NIA_API_KEY } = process.env;

// ─── LLM ───────────────────────────────────────────────────────────────────
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

// ─── NIA ────────────────────────────────────────────────────────────────────
// THIS IS THE ONLY VALID NIA FORMAT — DO NOT CHANGE
async function niaSearch(query) {
  if (!NIA_API_KEY) { console.warn('[NIA] NIA_API_KEY not set'); return []; }

  const attempts = [
    { url: 'https://apigcp.trynia.ai/v2/universal-search', body: { query } },
    { url: 'https://apigcp.trynia.ai/v2/universal-search', body: { query, search_mode: 'unified' } },
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
        console.log(`[NIA] ✅ ${url.split('/v2/')[1]} — ${results.length} results`);
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

// ─── FEATURE 6: NIA SOURCE CREDIBILITY ───────────────────────────────────────
function classifySource(url) {
  if (!url || url === 'unknown') return { badge: '🌐', label: 'Web', type: 'web' };
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('wikipedia') || hostname.includes('britannica') || hostname.includes('.edu')) {
      return { badge: '📚', label: 'Academic', type: 'academic' };
    }
    const MUSEUM_DOMAINS = [
      'britishmuseum', 'metmuseum', 'louvre', 'smithsonian', 'si.edu',
      'moma', 'guggenheim', 'nationalgallery', 'musee', 'museum',
      'getty', 'rijksmuseum', 'uffizi', 'hermitage', 'prado',
    ];
    if (MUSEUM_DOMAINS.some((d) => hostname.includes(d))) {
      return { badge: '🏛️', label: 'Official Museum', type: 'museum' };
    }
    const NEWS_DOMAINS = [
      'bbc', 'cnn', 'nytimes', 'theguardian', 'reuters', 'ap.org',
      'artnet', 'artnews', 'theartnewspaper', 'hyperallergic',
    ];
    if (NEWS_DOMAINS.some((d) => hostname.includes(d))) {
      return { badge: '📰', label: 'Press', type: 'news' };
    }
    return { badge: '🌐', label: 'Web', type: 'web' };
  } catch {
    return { badge: '🌐', label: 'Web', type: 'web' };
  }
}

// ─── RARITY LOGIC ────────────────────────────────────────────────────────────
function computeRarity(niaCount) {
  if (niaCount >= 15) return "Common";
  if (niaCount >= 10)  return "Rare";
  return "Legendary";
}

// ─── SEARCH ARTIFACTS ────────────────────────────────────────────────────────
app.post("/api/search-artifacts", async (req, res) => {
  try {
    const { regionName, museumName } = req.body;
    const query = museumName
  ? `${museumName} collection masterpieces permanent exhibits highlights`
  : `famous artifacts museums ${regionName} collection exhibit`;

    const niaResults = await niaSearch(query);

    if (niaResults.length === 0) {
      return res.json({ artifacts: [], niaUsed: false, deadZone: true });
    }

    const niaContext = niaResults
      .slice(0, 8)
      .map((r) => r.text || r.snippet || r.content || "")
      .join("\n");

    const prompt = museumName
  ? `You are a museum expert. List exactly 5 famous artifacts from the permanent collection of "${museumName}".

CRITICAL: Every artifact MUST actually be in "${museumName}". Do not include artifacts from other museums even if they appear in the search data below.

Use the search data below only as a hint — if it mentions artifacts not in "${museumName}", ignore them.

Return ONLY valid JSON array, no markdown:
[
  {"name": "artifact name", "museum": "${museumName}", "shortDescription": "one sentence description", "era": "time period"}
]

Search data (use as hint only):
${niaContext}`
  : `Based on these search results, list exactly 5 real artifacts from museums in or near "${regionName}". Each must be genuinely held in a real museum.

Return ONLY valid JSON array, no markdown:
[
  {"name": "artifact name", "museum": "actual museum holding it", "shortDescription": "one sentence description", "era": "time period"}
]

Search results:
${niaContext}`;

    const rawText = await callLLM(prompt);
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    let artifacts;
    try {
      artifacts = JSON.parse(jsonStr);
    } catch {
      artifacts = [
        { name: "Ancient Vase", museum: museumName || "National Museum", shortDescription: "A beautifully crafted ceremonial vessel", era: "500 BC" },
        { name: "Bronze Figurine", museum: museumName || "National Museum", shortDescription: "A small but exquisite bronze statue", era: "200 AD" },
        { name: "Stone Tablet", museum: museumName || "National Museum", shortDescription: "An inscribed stone with ancient writing", era: "1000 BC" },
        { name: "Ivory Pendant", museum: museumName || "National Museum", shortDescription: "A delicately carved ornamental pendant", era: "300 AD" },
        { name: "Golden Chalice", museum: museumName || "National Museum", shortDescription: "A gilded ceremonial drinking cup", era: "700 AD" },
      ];
    }

    const withRarity = await Promise.all(
      artifacts.slice(0, 5).map(async (a) => {
        try {
          const rarityResults = await niaSearch(`${a.name} museum artifact history`);
          const niaCount = rarityResults.length;
          const rarity = computeRarity(niaCount);
          const firstUrl = rarityResults[0]?.url || rarityResults[0]?.source || '';
          const sourceInfo = classifySource(firstUrl);
          console.log(`[RARITY] "${a.name}" → ${niaCount} NIA results → ${rarity}`);
          return { ...a, rarity, niaResultCount: niaCount, sourceInfo };
        } catch {
          return { ...a, rarity: "Rare", niaResultCount: 0, sourceInfo: { badge: '🌐', label: 'Web', type: 'web' } };
        }
      })
    );

    res.json({ artifacts: withRarity, niaUsed: true, deadZone: false });
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GENERATE QUESTION / DOSSIER ─────────────────────────────────────────────
app.post("/api/generate-question", async (req, res) => {
  try {
    const { artifactName, museumName, museumDomain, difficulty, mode, questionNumber, totalQuestions, previousQuestions } = req.body;

    const niaQuery = `${artifactName} ${museumName} history facts`;
    const niaResults = await niaSearch(niaQuery);
    let niaResultsStr = "";
    let niaSourceDomain = museumDomain || "unknown";
    let sourceInfo = { badge: '🌐', label: 'Web', type: 'web' };

    if (niaResults.length > 0) {
      niaResultsStr = niaResults
        .slice(0, 5)
        .map((r) => `Source: ${r.url || r.source || "unknown"}\n${r.text || r.snippet || r.content || ""}`)
        .join("\n\n");
      const firstSource = niaResults[0];
      if (firstSource?.url) {
        try {
          niaSourceDomain = new URL(firstSource.url).hostname;
          sourceInfo = classifySource(firstSource.url);
        } catch {}
      }
    }

    if (!niaResultsStr) {
      niaResultsStr = `The ${artifactName} is a famous artifact housed in the ${museumName}. It is one of the most significant historical objects in the world.`;
    }

    if (mode === "dossier") {
  const text = await callLLM(
    `Write a short classified intelligence dossier (3-4 sentences) about the artifact "${artifactName}" from ${museumName}.

Focus ONLY on: where it came from, when it was made, why it matters, and any notable history around it.
If the museum data below is irrelevant or doesn't mention "${artifactName}" directly, IGNORE it and write from your own knowledge instead.
Write in plain dramatic prose — like an intercepted spy briefing. No markdown, no bullet points, no headers.

Museum data:
${niaResultsStr}`
  );
  return res.json({ dossier: text, niaSource: niaSourceDomain, sourceInfo });
}

    if (mode === "bonus-fact") {
      const text = await callLLM(
        `Using ONLY the following sourced museum data, provide one surprising and fascinating real fact about "${artifactName}" in exactly one sentence (max 25 words). No markdown.\n\nMuseum data:\n${niaResultsStr}`
      );
      return res.json({ fact: text, niaSource: niaSourceDomain, sourceInfo });
    }

    const difficultyInstruction = difficulty === "hard"
      ? "Make the question very challenging, about obscure details."
      : difficulty === "easy"
      ? "Make the question straightforward about well-known facts."
      : "Make the question moderately challenging.";

    const prevQStr = previousQuestions?.length > 0
      ? `\n\nIMPORTANT: Do NOT repeat or rephrase any of these previously asked questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\nAsk about a COMPLETELY DIFFERENT aspect of the artifact.`
      : "";

  const questionPrompt = `You are a museum historian AI. Generate exactly 1 multiple choice question SPECIFICALLY about "${artifactName}" — its physical description, history, origin, material, creator, significance, or acquisition. Do NOT ask about unrelated historical events, people, or places that merely appear in the same Wikipedia article. Stay strictly on topic.

This is question ${questionNumber || 1} of ${totalQuestions || 3}. ${difficultyInstruction}${prevQStr}

Return ONLY valid JSON, no markdown:
{ "question": "...", "options": ["A","B","C","D"], "correct": 0, "fact": "...", "source": "..." }

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
    questionData.niaSource = niaSourceDomain;
    questionData.sourceInfo = sourceInfo;

    res.json(questionData);
  } catch (e) {
    console.error("Function error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ─── CHARACTER VOICES ─────────────────────────────────────────────────────────
app.post("/api/character-lines", async (req, res) => {
  try {
    const { artifactName, museumName, thiefPersonality = "sarcastic" } = req.body;

    const niaResults = await niaSearch(`${artifactName} ${museumName} history`);
    const context = niaResults
      .slice(0, 3)
      .map((r) => r.text || r.snippet || r.content || "")
      .join("\n") || `${artifactName} is a famous artifact at ${museumName}.`;

    const personalityMap = {
      sarcastic: "sarcastic British art thief who uses dry wit and understatement",
      dramatic: "dramatically over-the-top Italian art thief who speaks with passionate flair",
      valleygirl: "valley girl art thief who says 'like' and 'literally' constantly",
      victorian: "Victorian-era gentleman villain who speaks in formal flowery old English",
      pirate: "swashbuckling pirate who uses nautical slang and says 'arrr'",
    };
    const thiefDesc = personalityMap[thiefPersonality] || personalityMap.sarcastic;

    const [guardianRaw, thiefRaw] = await Promise.all([
      callLLM(
        `You are a pompous, passionate museum guardian who has dedicated their life to protecting ancient artifacts. Using this context about "${artifactName}": "${context.slice(0, 300)}" — write ONE dramatic sentence reacting to a thief trying to steal this specific artifact. Reference the artifact by name. No quotes, no markdown, plain text only. Max 20 words.`
      ),
      callLLM(
        `You are a ${thiefDesc}. Using this context about "${artifactName}": "${context.slice(0, 300)}" — write ONE cocky sentence about why you want to steal this specific artifact. Reference the artifact by name. Stay fully in character. No quotes, no markdown, plain text only. Max 20 words.`
      ),
    ]);

    res.json({
      guardian: guardianRaw.trim().replace(/^["']|["']$/g, ""),
      thief: thiefRaw.trim().replace(/^["']|["']$/g, ""),
    });
  } catch (e) {
    console.error("Character lines error:", e);
    res.status(500).json({ guardian: "This artifact is under my protection!", thief: "I'll take the legendary one." });
  }
});

// ─── CONTROVERSY METER ────────────────────────────────────────────────────────
app.post("/api/controversy", async (req, res) => {
  try {
    const { artifactName } = req.body;

    const controversyResults = await niaSearch(
      `${artifactName} stolen looted repatriation controversy debate`
    );

    const CONTROVERSY_KEYWORDS = [
      "stolen", "looted", "theft", "heist", "repatriation", "controversy",
      "disputed", "illegal", "smuggled", "returned", "claimed", "colonial",
      "war spoils", "plundered", "demand", "ownership", "legal battle",
    ];

    const allText = controversyResults
      .map((r) => (r.text || r.snippet || r.content || "").toLowerCase())
      .join(" ");

    const hitKeywords = CONTROVERSY_KEYWORDS.filter((kw) => allText.includes(kw));
    const keywordHits = hitKeywords.length;
    const resultCount = controversyResults.length;

    const keywordScore = Math.min(80, (keywordHits / CONTROVERSY_KEYWORDS.length) * 80);
    const volumeBonus = keywordHits > 0 ? Math.min(20, (resultCount / 15) * 20) : 0;
    const controversyScore = Math.round(keywordScore + volumeBonus);

    let summary = "";
    if (keywordHits > 0 && controversyResults.length > 0) {
      const context = controversyResults.slice(0, 4).map((r) => r.text || r.snippet || r.content || "").join("\n");
      summary = await callLLM(
        `In one sentence (max 20 words), summarise the main controversy or theft history around "${artifactName}" based on this data. Be factual and dramatic. No markdown:\n\n${context}`
      );
    } else {
      summary = `No recorded theft or repatriation controversy found for ${artifactName}.`;
    }

    console.log(`[CONTROVERSY] "${artifactName}" → ${keywordHits} keywords, ${resultCount} results → score ${controversyScore}`);

    res.json({
      controversyScore,
      summary: summary.trim(),
      niaResultCount: resultCount,
      keywordsFound: hitKeywords,
      isHot: controversyScore >= 50,
    });
  } catch (e) {
    console.error("Controversy error:", e);
    res.status(500).json({ controversyScore: 0, summary: "Controversy data unavailable.", niaResultCount: 0, keywordsFound: [], isHot: false });
  }
});

// ─── DAILY HEIST ─────────────────────────────────────────────────────────────
const dailyCache = { date: null, data: null };

app.post("/api/daily-heist", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    if (dailyCache.date === today && dailyCache.data) {
      return res.json(dailyCache.data);
    }

    const [newsResults, discoveryResults] = await Promise.all([
      niaSearch(`museum artifact stolen repatriation news 2026`),
      niaSearch(`ancient artifact archaeological discovery museum 2026`),
    ]);

    const allResults = [...newsResults, ...discoveryResults];
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const seedIndex = dayOfYear % Math.max(allResults.length, 1);
    const seededContext = allResults.length > 0
      ? (allResults[seedIndex]?.text || allResults[seedIndex]?.snippet || "")
      : "";

    const prompt = `You are a museum heist game designer. Based on the news context below, create a daily challenge about a REAL, PHYSICAL, HISTORICAL museum artifact — such as a painting, sculpture, ancient relic, ceremonial object, or stolen jewel.

STRICT RULES:
- The artifact MUST be a real physical object that exists (or existed) in a real museum
- Do NOT use software, AI systems, digital tools, or technology as the artifact
- Do NOT invent fictional museums
- If context is irrelevant, fall back to a famous artifact in a repatriation dispute

Return ONLY valid JSON, no markdown:
{
  "artifactName": "name of a real physical historical artifact",
  "museum": "real museum name",
  "era": "historical time period",
  "shortDescription": "one sentence physical description",
  "heistBriefing": "2 dramatic sentences as a classified intelligence briefing",
  "difficulty": "hard",
  "newsHook": "one sentence of real context (max 15 words)"
}

News context:
${seededContext || "No live news found. Use a famous artifact in a repatriation dispute."}`;

    const rawText = await callLLM(prompt);
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    let dailyData;
    try { dailyData = JSON.parse(jsonStr); }
    catch {
      dailyData = {
        artifactName: "Elgin Marbles", museum: "British Museum", era: "447–432 BC",
        shortDescription: "Ancient Greek marble sculptures removed from the Parthenon in Athens",
        heistBriefing: "Intelligence confirms the Elgin Marbles are being transferred tonight. This is our only window.",
        difficulty: "hard", newsHook: "Greece renews repatriation demands as talks stall.",
      };
    }

    // Sanity check — reject AI/tech nonsense
    const isSuspect = ["AI", "software", "digital", "generative", "LLM", "model", "system"].some(
      (word) => (dailyData.artifactName || "").toLowerCase().includes(word.toLowerCase())
    );
    if (isSuspect) {
      dailyData = {
        artifactName: "Koh-i-Noor Diamond", museum: "Tower of London", era: "Pre-1300",
        shortDescription: "A 105-carat diamond of Indian origin set in the British Crown Jewels",
        heistBriefing: "The Koh-i-Noor is on display for a special exhibition. Our contact has left a window unguarded.",
        difficulty: "hard", newsHook: "India renews demand for return of the Koh-i-Noor diamond.",
      };
    }

    const result = { ...dailyData, date: today, niaResultCount: allResults.length, niaUsed: allResults.length > 0 };
    dailyCache.date = today;
    dailyCache.data = result;
    res.json(result);
  } catch (e) {
    console.error("Daily heist error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ─── ARTIFACT TRAIL ───────────────────────────────────────────────────────────
app.post("/api/artifact-trail", async (req, res) => {
  try {
    const { artifactName, currentRegion } = req.body;

    const niaResults = await niaSearch(
      `${artifactName} trade route influence origin history region connection`
    );

    const context = niaResults
      .slice(0, 5)
      .map((r) => r.text || r.snippet || r.content || "")
      .join("\n") || `${artifactName} has historical connections to various civilizations.`;

    const prompt = `Based on this historical data about "${artifactName}", identify ONE different world region or city (NOT "${currentRegion}") that has a real historical connection to this artifact. Return ONLY valid JSON, no markdown:
{
  "region": "city or country name",
  "lat": latitude_as_number,
  "lng": longitude_as_number,
  "connection": "one sentence max 15 words explaining the historical link"
}
Historical data:
${context}`;

    const rawText = await callLLM(prompt);
    let jsonStr = rawText.trim();
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    let trail;
    try { trail = JSON.parse(jsonStr); }
    catch { trail = { region: "Greece", lat: 37.9838, lng: 23.7275, connection: "Ancient trade routes connected this artifact to Mediterranean civilizations." }; }

    res.json({ ...trail, niaResultCount: niaResults.length });
  } catch (e) {
    console.error("Artifact trail error:", e);
    res.status(500).json({ error: e.message });
  }
});

// ─── DEAD ZONE MESSAGE ───────────────────────────────────────────────────────
app.post("/api/dead-zone", async (req, res) => {
  try {
    const { regionName, thiefPersonality = "sarcastic" } = req.body;
    const personalityMap = {
      sarcastic: "sarcastic British art thief",
      dramatic: "dramatic Italian art thief",
      valleygirl: "valley girl art thief",
      victorian: "Victorian gentleman villain",
      pirate: "pirate",
    };
    const desc = personalityMap[thiefPersonality] || personalityMap.sarcastic;
    const message = await callLLM(
      `You are a ${desc}. You just searched "${regionName || 'this location'}" for artifacts to steal and found absolutely nothing of value. Write ONE funny in-character dismissive comment about this location. Max 20 words. No quotes, no markdown.`
    );
    res.json({ message: message.trim().replace(/^["']|["']$/g, "") });
  } catch (e) {
    res.status(500).json({ message: "Not even I would bother with this place." });
  }
});

// ─── BANTER ──────────────────────────────────────────────────────────────────
// Gemini generates 4 lines of back-and-forth Guardian/Thief dialogue.
// context: "searching" | "deal" | "questioning" | "victory" | "defeat" | "vault"
app.post("/api/banter", async (req, res) => {
  try {
    const { artifactName = "", museumName = "", context = "searching" } = req.body;

    const contextPrompts = {
      searching: `NIA is scanning databases for "${artifactName || 'artifacts'}" at "${museumName || 'the museum'}". The Thief waits impatiently. The Guardian watches nervously.`,
      deal: `The Thief proposes a deal: answer 3 questions about "${artifactName}" and the player keeps it. The Guardian is outraged at this arrangement.`,
      questioning: `The player is being tested on their knowledge of "${artifactName}". The Thief quizzes them gleefully. The Guardian desperately wants the player to succeed.`,
      victory: `The player won "${artifactName}" by answering correctly. The Thief must reluctantly hand it over. The Guardian is appalled the deal was made at all.`,
      defeat: `The player failed the quiz about "${artifactName}". The Thief gleefully keeps it. The Guardian is secretly relieved.`,
      vault: `The player views their stolen collection. The Thief gives a smug tour. The Guardian fumes at every piece on display.`,
    };

    const contextDesc = contextPrompts[context] || contextPrompts.searching;

    const text = await callLLM(`Generate a punchy back-and-forth conversation between two characters.

SITUATION: ${contextDesc}

THE GUARDIAN: Pompous, passionate, deeply sincere, slightly ridiculous. Gets flustered easily. British energy.
THE THIEF: Sarcastic, witty, always has the upper hand. References the artifact by name when possible.

Generate EXACTLY 4 lines alternating Guardian, Thief, Guardian, Thief.
Each line MUST be under 15 words. Make it theatrical, fun, and genuinely funny.

Return ONLY valid JSON, no markdown:
{
  "lines": [
    { "speaker": "guardian", "text": "..." },
    { "speaker": "thief", "text": "..." },
    { "speaker": "guardian", "text": "..." },
    { "speaker": "thief", "text": "..." }
  ]
}`);

    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    let banter;
    try { banter = JSON.parse(jsonStr); }
    catch {
      banter = {
        lines: [
          { speaker: "guardian", text: "You will not lay a finger on that artifact." },
          { speaker: "thief",    text: "Relax. I am just admiring it from a distance." },
          { speaker: "guardian", text: "I know exactly what you are planning." },
          { speaker: "thief",    text: "Then you know there is nothing you can do about it." },
        ],
      };
    }

    res.json(banter);
  } catch (e) {
    console.error("Banter error:", e);
    res.status(500).json({
      lines: [
        { speaker: "guardian", text: "Stand back. This collection is under my protection." },
        { speaker: "thief",    text: "Protection? From me? That is adorable." },
        { speaker: "guardian", text: "I am warning you for the last time." },
        { speaker: "thief",    text: "And I am ignoring you for the hundredth." },
      ],
    });
  }
});

// ─── SEARCH MUSEUMS ──────────────────────────────────────────────────────────
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
app.listen(PORT, () => console.log(`🏛️  Heistory server running on http://localhost:${PORT}`));