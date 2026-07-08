# MSME Health Card

A full-stack app for scoring and visualizing the financial health of MSMEs (Micro, Small &
Medium Enterprises).

## Structure

```
msme-health-card/
├── backend/            FastAPI app (Python 3.11+)
│   ├── data/            synthetic datasets
│   ├── engine/          scoring logic
│   ├── agents/          AI agent modules
│   ├── api/              route handlers
│   ├── models/          pydantic/SQLAlchemy schemas
│   ├── database.py      SQLAlchemy engine/session setup
│   └── main.py          FastAPI app entrypoint
└── frontend/            Next.js 14 app (TypeScript, App Router)
```

## Running the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Check `http://localhost:8000/health`
for a liveness check, or `http://localhost:8000/docs` for the interactive OpenAPI docs.

Storage is SQLite (`backend/msme_health.db`), managed via SQLAlchemy. Tables are created
automatically on startup.

## Synthetic demo data

`backend/data/generator.py` generates 12 months of GST, UPI, Account Aggregator (bank),
and EPFO data for 18 fictional MSMEs, deliberately varied (thin-file-but-healthy,
looks-good-on-paper-but-declining, and a stable/growing/seasonal mix) to give the scoring
engine useful contrast to demo against.

```bash
cd backend
source venv/bin/activate
python data/generator.py
```

This writes one JSON file per business plus `businesses_index.json` to
`backend/data/synthetic/`. The dataset is deterministic (fixed seed), so re-running it
regenerates the same data. Once generated, it's served via:

- `GET /api/businesses` — list of business IDs, names, sectors, and archetypes
- `GET /api/businesses/{business_id}/raw` — the raw synthetic data for one business

## Scoring engine

`backend/engine/scoring.py` computes 7 sub-scores (revenue stability, cash flow health,
liquidity, compliance, customer/vendor concentration, invoice collection efficiency, and
digital footprint depth) from a business's raw synthetic data, then combines them into an
overall 0-100 Health Score using a configurable weights dict. Sub-scores with no
underlying data (e.g. no EPFO records for a sole proprietor with no employees) are
dropped from the weighted average rather than scored as 0 — see the module docstring and
`compute_overall` for the reweighting logic.

- `GET /api/businesses/{business_id}/score` — overall score, all 7 sub-scores, a 6-month
  trend line, and `data_completeness` showing which sources were available

Run the unit tests with:

```bash
cd backend
source venv/bin/activate
pytest tests/
```

## AI agent pipeline

`backend/agents/` turns a business's scoring output into plain-English analysis using
Claude (Anthropic API), as three independently-callable stages:

- `risk_agent.py` — identifies 2-3 strengths, 2-3 risks, and any anomalies (e.g. a sudden
  balance drop, a GST filing gap), grounded in the actual sub-scores and a 12-month
  financial summary (not the full raw dataset — see `agents/context.py`).
- `recommendation_agent.py` — turns the risk agent's output into 3-4 concrete,
  actionable recommendations with rationale.
- `narrative_agent.py` — writes a 4-6 sentence natural-language summary of the
  business's financial health, the way a credit analyst would explain it to a loan
  officer.

Each stage is its own LLM call and is caught independently in `agents/pipeline.py` — if
one stage fails (bad API key, rate limit, refusal), the others still return their
results, and the failure shows up in an `errors` field rather than a crash. Successful
runs are cached in `backend/agents/analysis_cache.db` (SQLite, keyed by business ID) so
repeated dashboard loads don't re-trigger LLM calls; pass `?force_refresh=true` to bypass
the cache for one request.

- `GET /api/businesses/{business_id}/analysis` — `{narrative, strengths, risks,
  anomalies, recommendations, errors, cached}`

Requires an Anthropic API key in `backend/.env` (`ANTHROPIC_API_KEY` or `LLM_API_KEY` —
see `.env.example`). Without one, the endpoint still responds successfully with every
stage's `errors` entry explaining the missing key, rather than a 500.

## Running the frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

The app will be available at `http://localhost:3000` and will call the backend at the URL
configured by `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).

## Running both together

Start the backend and frontend in two separate terminals as above, then open
`http://localhost:3000` — the homepage fetches `/health` from the backend and displays its
status, confirming the stack runs end to end. CORS is pre-configured on the backend to
allow requests from `http://localhost:3000`.

## Environment variables

See `.env.example` for the environment variables the backend needs (e.g. the LLM API key
for the `/agents` modules), and `frontend/.env.local.example` for the frontend.
