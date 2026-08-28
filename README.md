# Antigravity Opportunity Radar

An intelligent global news event ingestion, story clustering, and AI-driven market opportunity discovery engine built with Next.js, TypeScript, PostgreSQL, and OpenAI-compatible LLM APIs (Groq, Together AI, Ollama, OpenRouter).

---

## Product Overview

**Antigravity Opportunity Radar** monitors real-time global news events via the GDELT (Global Data on Events, Location, and Tone) project. It filters relevant event signals across key industrial sectors, clusters related story threads using multi-dimensional metadata, and leverages AI models to synthesize actionable business, innovation, and investment opportunities.

### Key Capabilities

- **GDELT Event Ingestion**: High-throughput parsing and scoring of GDELT event streams based on sector keywords, Goldstein scale impact, average tone, and country relevance.
- **Story Clustering**: In-memory and persistent grouping of news articles into story clusters based on 24-hour proximity, actors, event codes, and geographic regions.
- **Opportunity Generation Engine**: AI synthesis of story clusters into structured opportunities categorized into three strategic pillars:
  - **Business**: Commercial products, B2B services, export opportunities, and operational enhancements.
  - **Innovation**: R&D breakthroughs, tech applications, and business model pivots.
  - **Investment**: Early-stage capital deployment, infrastructure projects, and joint ventures.
- **Viability Scoring & Color Bands**: Consolidated probability scoring (`Probability = Feasibility * 40% + Impact * 40% + Time-To-Market * 20%`) categorized into visual viability bands:
  - 🟢 **Green (71–100%)**: High Viability & Fast Execution
  - 🟠 **Orange (41–70%)**: Moderate Feasibility / Conditional Risk
  - 🔴 **Red (0–40%)**: Speculative / High Risk
- **Interactive Opportunity Dashboard**: Next.js App Router frontend featuring real-time signal metrics, multi-parameter filtering, slide-over detail views, and interactive executive Q&A assistant.

---

## Local Setup Instructions

### Prerequisites

- **Node.js**: v20+
- **PostgreSQL**: v14+ (optional for dry-run mode, required for full DB persistence)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd news-to-opportunities
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   *Note: If no `DATABASE_URL` or `LLM_API_KEY` is provided, the application runs in mock/fallback mode for development.*

---

## Required Environment Variables

All configuration settings are controlled via environment variables. Refer to `.env.example` for details:

| Variable | Description | Default / Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `LLM_BASE_URL` | OpenAI-compatible endpoint | `https://api.groq.com/openai/v1` |
| `LLM_API_KEY` | LLM provider API Key | *(empty for mock mode)* |
| `LLM_MODEL` | LLM model identifier | `llama-3.3-70b-versatile` |
| `LLM_MAX_RETRIES` | Max retries for transient LLM errors | `3` |
| `MIN_RELEVANCE_SCORE` | Minimum relevance threshold (0.0 to 1.0) | `0.35` |
| `MIN_NUM_MENTIONS` | Minimum GDELT article mention count | `2` |
| `MIN_TONE` | Minimum average tone filter | `-10` |
| `MAX_TONE` | Maximum average tone filter | `10` |
| `BATCH_SIZE` | Database batch upsert size | `250` |
| `GDELT_MAX_LINES` | Max GDELT CSV lines to process (0 = unlimited) | `0` |

---

## Development & Pipeline Commands

```bash
# Install dependencies
npm install

# Run automated test suite
npm test

# Perform TypeScript type checking
npm run typecheck

# Build for production
npm run build

# Start Next.js development server
npm run dev

# Run GDELT ingestion in dry-run mode (no DB writes)
npm run ingest:dry-run

# Run Opportunity Generation pipeline in dry-run mode
npm run opportunities:dry-run

# Run production GDELT ingestion (requires DATABASE_URL)
npm run ingest

# Run production Opportunity Generation (requires DATABASE_URL & LLM_API_KEY)
npm run opportunities
```

---

## Vercel Deployment

Deploying the project to Vercel requires zero complex custom server configuration:

1. **Push Repository to GitHub**: Ensure all code changes are pushed to your GitHub repository.
2. **Import Project into Vercel**:
   - Log in to the [Vercel Dashboard](https://vercel.com).
   - Click **Add New** > **Project** and select your GitHub repository.
   - Framework Preset will automatically detect **Next.js**.
3. **Configure Environment Variables**:
   - In the Vercel deployment settings, add your production environment variables (`DATABASE_URL`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`).
4. **Deploy**:
   - Click **Deploy**. Vercel will build and host the application globally.

---

## Disclaimer

**Informational & Educational Use Only**: All market opportunity signals, viability scores, strategic analyses, feasibility ratings, and executive Q&A responses generated by this system are automatically computed from open-source news data and large language models. They are provided strictly for informational and research purposes and **do not constitute investment, financial, legal, tax, or professional business advice**. Users should conduct independent due diligence before making any financial commitments or strategic investments based on these signals.
