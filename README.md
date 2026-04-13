# 🏛️ Heistory
### *Learn history through the heist.*

> A map-based narrative learning experience where curiosity becomes exploration — and exploration becomes a personal archive of knowledge you build over time.

---

## What is Heistory?

Heistory turns history into a heist. Instead of reading about artifacts, you discover them, interrogate them, and earn them through knowledge.

Two characters guide every session — **The Guardian**, who protects the world's artifacts with dramatic devotion, and **The Thief**, who has a proposal: *answer 3 questions about this artifact correctly, and it's yours. Fail, and it stays in my collection. Permanently.*

Every artifact is real. Every question is grounded in actual historical data. And the rarity of each artifact — Common, Rare, or Legendary — is determined live by how much the internet actually knows about it.

---

## How It Works

```
Map click / Museum select
        ↓
NIA retrieves real artifacts from that location
        ↓
Rarity assigned based on global knowledge density
        ↓
Gemini generates a classified dossier + quiz questions
        ↓
Guardian & Thief react dynamically via AI-generated banter
        ↓
Answer 3 questions correctly → artifact added to your Vault
```

---

## Features

**NIA-Powered Artifact Discovery**
Click anywhere on the world map or select a featured museum. NIA searches for real artifacts tied to that location — not fictional objects, but ones grounded in actual historical records.

**Live Rarity Engine**
Rarity is calculated from NIA result density. Fewer results = the artifact is obscure = Legendary. More results = widely documented = Common. Global knowledge becomes a gameplay signal.

**The Guardian & The Thief**
Two AI characters with distinct personalities react to every artifact you encounter. Their banter is generated live by Gemini — different every session, always in character.

**Heist Briefing Dossier**
Before each challenge, you receive a classified intelligence dossier on your target: provenance, history, significance, and any real theft or repatriation controversies.

**Controversy Detection**
Artifacts tied to theft, looting, or repatriation disputes are flagged with a live Controversy Index — scored by keyword density across NIA results.

**Source Credibility Badges**
Every piece of information is tagged with its source type: Official Museum, Academic, Press, or Web — so you always know where the intel came from.

**The Vault**
Your personal archive of every artifact you've earned. Each one is a record of a real learning moment.

**Daily Heist**
A new artifact challenge every day, pulled from live museum and cultural heritage news via NIA.

**Artifact Trail**
Each artifact surfaces a historical connection to another region — linking discoveries across time and geography.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express |
| Retrieval | NIA (universal search) |
| Generation | Gemini 2.5 Flash |
| Map | Leaflet + Stadia Maps |
| Styling | Tailwind CSS |

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Mallika1405/Museum-Heist-Game.git
cd Museum-Heist-Game
npm install
```

### 2. Create your `.env` file in the project root

```env
GEMINI_API_KEY=your_gemini_api_key
NIA_API_KEY=your_nia_api_key
```

- **Gemini API Key** → [Google AI Studio](https://aistudio.google.com)
- **NIA API Key** → [trynia.ai](https://trynia.ai)

### 3. Start the backend (Terminal 1)

```bash
npm run server
```

Starts the Express API at `http://localhost:3001`

### 4. Start the frontend (Terminal 2)

```bash
npm run dev
```

Starts Vite at `http://localhost:5173`

### 5. Open and start heisting

```
http://localhost:5173
```

---

## The Story Behind It

We have all been in that place where learning history feels like a chore. You open a textbook, read page after page of disconnected facts, and nothing really sticks.

We wanted to flip that completely. Instead of treating history as something you read about, we started thinking about it as something you experience. What if learning felt like stepping into a story? What if you were not just memorizing artifacts, but actually discovering them, understanding them, and earning them?

That idea became Heistory.

We were also drawn to something deeper: knowledge in the real world is uneven. Some artifacts are heavily documented. Others are barely mentioned. Using NIA, we realized we could measure that difference and turn it into a meaningful gameplay signal — reflecting how much the world actually knows about something.

---

## Built at SDxUCSD Agent Hackathon

Made with way too much caffeine and a genuine belief that learning should feel like discovery.

**Team**
- Mallika Dasgupta
- Kiruthika Marikumaran

---

*Explore. Discover. Steal history.*
