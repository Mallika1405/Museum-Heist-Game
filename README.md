# 🏛️ Heistory — Collectible Artifact Game

A history-based educational collectible card game. Click the map, discover real artifacts via NIA + Gemini AI, and answer questions to steal them!

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file** (in the project root):
   ```
   GEMINI_API_KEY=your_gemini_api_key
   NIA_API_KEY=your_nia_api_key
   ```

3. **Start the backend server** (in one terminal):
   ```bash
   npm run server
   ```
   This starts the Express API on `http://localhost:3001`

4. **Start the frontend** (in another terminal):
   ```bash
   npm run dev
   ```
   This starts Vite on `http://localhost:5173`

5. Open `http://localhost:5173` and start heisting! 🎯

## API Keys

- **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/apikey)
- **NIA API Key**: Get from [trynia.ai](https://trynia.ai)

## How It Works

- Click anywhere on the map or pick a featured museum
- NIA searches for real artifacts from that region
- Gemini generates a classified dossier and quiz questions
- Answer 3 questions correctly to "steal" the artifact into your collection
- Rarity is determined by how famous the artifact is (Common / Rare / Legendary)
