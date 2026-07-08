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
