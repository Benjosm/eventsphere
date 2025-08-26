# EventSphere - Interactive Global Event Visualization Platform

EventSphere is a self-contained 3D visualization platform that renders real-time global events on an interactive globe, powered by AI-driven clustering for intelligent thematic navigation. Built for use cases like crisis monitoring and situational awareness, EventSphere processes event data with **local machine learning models**—ensuring complete data privacy with no external API dependencies.

The platform’s unique value proposition lies in its **on-device clustering logic**, which automatically identifies and labels thematic patterns (e.g., "Civil Unrest", "Natural Disaster") from unstructured event descriptions. All data remains within the encrypted local environment, making EventSphere ideal for sensitive or air-gapped deployments.

---

## 🚀 Features

- **Interactive 3D Globe**: GPU-accelerated globe using Three.js and React Three Fiber for smooth real-time rendering.
- **AI-Driven Clustering**: Uses scikit-learn’s `MiniBatchKMeans` with NLP preprocessing to group events and auto-generate cluster labels locally.
- **Real-Time Filtering**: Filter events by time range and category, with immediate visual updates.
- **Encrypted Data Storage**: Persistent storage via SQLCipher with AES-256 encryption at rest.
- **Secure Access**: Stateless JWT authentication over HttpOnly cookies—no user accounts or external identity providers.
- **Zero Cloud Dependency**: Entire stack runs locally; no telemetry, cloud APIs, or data exfiltration.

---

## 🛠️ Architecture & Technology Stack

### Backend
- **Framework**: FastAPI 0.114.0
- **Language**: Python 3.11
- **ORM**: SQLModel 0.0.18 (type-safe SQLAlchemy + Pydantic integration)
- **ML**: scikit-learn 1.5.1, joblib 1.4.2
- **Caching**: `cachetools` 5.4.0 (LRU cache for cluster labels)
- **Auth**: PyJWT + custom middleware for signed JWT in HttpOnly cookies
- **Database**: SQLite encrypted with SQLCipher 4.6.1 (`pysqlcipher3==1.0.1`)

### Frontend
- **Framework**: React 18 + Vite 5
- **3D Engine**: Three.js 0.164.0
- **Rendering**: @react-three/fiber 8.17.1, drei 9.103.0
- **State Management**: Zustand (simple and lightweight)

### Data & Security
- **Encryption**: AES-256 via SQLCipher, key derived using PBKDF2 from app secret
- **Validation**: Pydantic models with strict type and length constraints
- **Secure Defaults**: No debug mode in production, input sanitation, rate limiting (future)

---

## 🗂️ Project Structure

```
/eventsphere
├── /backend
│   ├── main.py               # FastAPI app factory and routes
│   ├── db.py                 # Encrypted database connection setup
│   ├── models.py             # SQLModel and Pydantic schemas
│   ├── clustering.py         # ML pipeline for event clustering
│   └── security/
│       └── jwt.py            # JWT creation and validation
├── /frontend
│   ├── src/
│   │   ├── components/       # Reusable UI and 3D components (Globe, Sidebar)
│   │   ├── lib/              # Three.js scene and camera setup
│   │   ├── store.js          # Global state with Zustand
│   │   └── main.jsx          # App entry point
│   ├── index.html
│   └── vite.config.js
├── /data
│   └── events.enc            # Encrypted database (pre-seeded with sample data)
├── pyproject.toml            # Poetry-based Python dependencies
├── package.json              # Frontend dependencies and scripts
├── README.md                 # You are here
└── .env.example              # Environment template
```

---

## 🔐 Security Design

- **Authentication**: Time-limited JWT tokens issued via `/login`, stored in HttpOnly cookies to prevent XSS.
- **Authorization**: All API endpoints except `/login` and `/docs` require valid tokens.
- **Data at Rest**: Full database encryption using SQLCipher with 256-bit AES.
- **Key Management**: Database key derived from app secret using PBKDF2 (salted, 100,000 iterations).
- **Input Safety**: All inputs validated via Pydantic with constraints (e.g., `constr(max_length=200)`).
- **Verification**:
  - Manual code inspection of `security/jwt.py`
  - Unit tests confirming expired/invalid tokens return 401

---

## ▶️ Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Poetry (for Python dependency management)
- `npm` or `yarn`

### Installation

```bash
# Clone the repository
git clone https://github.com/example/eventsphere.git
cd eventsphere

# Install Python dependencies
poetry install

# Initialize encrypted database
poetry run python -m backend.db init

# Install frontend dependencies
cd frontend
npm ci

# Start development servers
# In one terminal:
poetry run uvicorn backend.main:app --reload --port=8000

# In another terminal:
cd frontend && npm run dev
```

Visit:
- **API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:5173

---

## 🧪 Development & Testing

### Running Tests

```bash
poetry run pytest
```

Tests include:
- DB repository methods (with in-memory SQLite mock)
- Clustering logic (with fake data and expected output assertions)
- Auth middleware (expired/invalid token handling)

### Stubbing & Simulation

- **Testing Mode (`ENV=testing`)**: Activates `FakeClusterer` returning static cluster names.
- **In-Memory DB**: Used during unit tests for isolation and speed.
- **Verification**: Unit tests confirm clustering output consistency and correct filtering.

---

## 📦 Build & Deployment

### Build Frontend
```bash
cd frontend
npm run build
```

Output: `frontend/dist/` (static files, ready for serving)

### Run Production Server
```bash
poetry run uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Serve frontend via CDN, or proxy through a web server (e.g., Nginx).

---

## ✅ Completion Criteria

- [x] `poetry run uvicorn backend.main:app --port 8000` starts successfully
- [x] `curl http://localhost:8000/docs` returns 200 with OpenAPI spec
- [x] Frontend renders interactive globe at http://localhost:5173
- [x] Globe is rotatable and zoomable (manual verification)
- [x] Clicking regions displays sample cluster info in sidebar
- [x] Time and category filters update visible events
- [x] `poetry run pytest` passes all unit tests (DB, ML, auth)

---

## 🧩 Module Verification Plan

| Module | Verification Method |
|-------|---------------------|
| `api.routes.events` | Use `curl '/events?start=2024-01-01&end=2024-01-31'` and validate JSON response |
| `domain.clustering` | Run `python -m backend.clustering` with test data and inspect cluster name output |
| `infra.db.repository` | Pytest with mocked SQLModel session; verify SQL queries and filters |
| `frontend/components/Globe` | Manual inspection: rotate, zoom, check event markers appear |

---

## 📜 License

MIT License. See `LICENSE` for details.

---

## 🙌 Acknowledgments

Built with:
- FastAPI – Modern, fast (high-performance) web framework
- React Three Fiber – Seamless Three.js integration with React
- SQLCipher – Full database encryption
- scikit-learn – Accessible and efficient ML tools

Privacy-first design for a world that needs visibility without compromise.
