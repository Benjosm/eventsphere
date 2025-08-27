# EventSphere - Interactive Global Event Visualization Platform

EventSphere is a self-contained 3D visualization platform that renders real-time global events on an interactive globe, powered by AI-driven clustering for intelligent thematic navigation. Built for use cases like crisis monitoring and situational awareness, EventSphere processes event data with **local machine learning models**—ensuring complete data privacy with no external API dependencies.

The platform’s unique value proposition lies in its **on-device clustering logic**, which automatically identifies and labels thematic patterns (e.g., "Civil Unrest", "Natural Disaster") from unstructured event descriptions. All data remains within the local environment, making EventSphere ideal for air-gapped or privacy-sensitive deployments.

---

## 🚀 Features

- **Interactive 3D Globe**: GPU-accelerated globe using Three.js and React Three Fiber for smooth real-time rendering.
- **AI-Driven Clustering**: Uses WebAssembly-compiled scikit-learn’s `MiniBatchKMeans` via pyodide-sklearn, running **entirely in-browser**; model bundles under 5MB ensure fast load times.
- **Real-Time Filtering**: Filter events by time range and category, with immediate visual updates.
- **Encrypted Data Storage**: Persistent storage via SQLCipher with AES-256 encryption—data at rest is secure and portable.
- **Stateless Authentication**: JWT-based API access via HttpOnly cookies (no user accounts; tokens issued on `/login` with short TTL).
- **Offline-First Design**: Entire stack runs locally; no telemetry, cloud APIs, or data exfiltration.

---

## 🛠️ Architecture & Technology Stack

### Backend
- **Framework**: FastAPI 0.114.0
- **Language**: Python 3.11
- **ORM**: SQLModel 0.0.18 (type-safe SQLAlchemy + Pydantic integration)
- **Database**: SQLCipher 4.6.1 via pysqlcipher3==1.0.1 (SQLite with AES-256 encryption)
- **Auth**: JWT Bearer tokens in HttpOnly cookies (stateless, signed via app secret)
- **Caching**: `cachetools` 5.4.0 (LRU cache for cluster labels, max 100 entries)
- **KDF**: PBKDF2 for secure database key derivation from app secret

### Frontend
- **Framework**: React 18 + Vite 5
- **3D Engine**: Three.js 0.164.0
- **Rendering**: @react-three/fiber 8.17.1, drei 9.103.0
- **State Management**: Zustand
- **ML Runtime**: pyodide-sklearn (WebAssembly-compiled scikit-learn for client-side MiniBatchKMeans)

### Data & Validation
- **Validation**: Pydantic models with strict type and length constraints
- **Input Sanitization**: All inputs validated using `conint(gt=0)`, `constr(max_length=200)`, etc.
- **Secure Defaults**: No debug mode in production, parameterized SQL queries, no external API calls

---

## 🗂️ Project Structure

```
/eventsphere
├── /backend
│   ├── main.py               # FastAPI app factory and routes
│   ├── db.py                 # SQLCipher connection setup and initialization
│   ├── models.py             # SQLModel and Pydantic schemas
│   ├── clustering.py         # ML pipeline (stubbed for testing)
│   ├── security/
│   │   └── jwt.py            # JWT generation, validation, and middleware
│   └── __init__.py           # Package initialization
├── /frontend
│   ├── src/
│   │   ├── components/       # Reusable UI and 3D components (Globe, Sidebar, ClusterInfo)
│   │   ├── lib/              # Three.js scene setup, clustering logic
│   │   ├── store.js          # Global state with Zustand
│   │   ├── App.jsx           # Root component with routing and providers
│   │   └── main.jsx          # Entry point
│   ├── index.html
│   └── vite.config.js
├── /data
│   └── events.enc            # Encrypted SQLite database (pre-seeded with sample data)
├── pyproject.toml            # Poetry-based Python dependencies
├── package.json              # Frontend dependencies and scripts
├── README.md                 # You are here
└── .env.example              # Environment template (for future extensions)
```

---

## 🔐 Security Design

- **Authentication**: Stateless JWT in HttpOnly cookies (no user accounts). `/login` endpoint generates time-limited tokens for API access (e.g., 15-minute expiry).
- **Encryption at Rest**: SQLCipher 4.6.1 with AES-256; database key derived from `APP_SECRET` via PBKDF2 (100,000 iterations).
- **Input Safety**: All user inputs validated via Pydantic models with constraints (e.g., `constr(max_length=200)`).
- **Query Safety**: Parameterized queries via SQLModel ORM prevent SQL injection.
- **Validation Verification**:
  - Unit tests confirm invalid payloads return 422 Unprocessable Entity
  - Manual inspection of `models.py` confirms constrained field definitions
  - JWT middleware tested with expired/invalid tokens (expect 401 Unauthorized)

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
- **Login**: Access http://localhost:8000/login to receive JWT cookie (valid for 15 minutes)

---

## 🧪 Development & Testing

### Running Tests

```bash
poetry run pytest
```

Tests include:
- DB repository methods (with in-memory SQLite mock)
- Clustering logic (mocked in test environment; verifies label consistency)
- Input validation (ensuring malformed payloads are rejected with 422)
- Authentication (expired/invalid tokens return 401)

### Stubbing & Simulation

- **Testing Mode (`VITE_MODE=test`)**: Frontend activates mocked `clusterEvents()` returning static cluster labels.
- **In-Memory DB**: Used during backend unit tests for isolation and speed.
- **JWT Testing**: Mocked time provider ensures token expiry behavior is verified.
- **Verification**: Unit tests confirm clustering output consistency, correct filtering, and auth middleware behavior.

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
poetry run uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Serve frontend via CDN, or proxy through a web server (e.g., Nginx). Full offline deployment supported.

---

## ✅ Completion Criteria

- [x] `poetry run uvicorn backend.main:app --port 8000` starts successfully
- [x] `curl http://localhost:8000/docs` returns 200 with OpenAPI spec
- [x] Frontend renders interactive globe at http://localhost:5173
- [x] Globe is rotatable and zoomable (manual verification)
- [x] Clicking regions displays sample cluster info in sidebar
- [x] Time and category filters update visible events
- [x] `poetry run pytest` passes all unit tests (DB, ML, validation, auth)

---

## 🧩 Module Verification Plan

| Module | Verification Method |
|-------|---------------------|
| `api.routes.events` | Use `curl '/events?start=2024-01-01&end=2024-01-31'` and validate JSON response |
| `frontend/lib/clustering` | Run `console.log(clusterEvents(TEST_EVENTS))` in browser devtools; verify output in test mode |
| `infra.db.repository` | Pytest with mocked SQLModel session; verify SQL queries and filters |
| `frontend/components/Globe` | Manual inspection: rotate, zoom, check event markers appear |
| `security.jwt` | Unit test with expired/invalid token; expect 401 Unauthorized |

---

## 📜 License

MIT License. See `LICENSE` for details.

---

## 🙌 Acknowledgments

Built with:
- FastAPI – Modern, fast (high-performance) web framework
- React Three Fiber – Seamless Three.js integration with React
- SQLCipher – Secure, embedded encrypted database
- pyodide-sklearn – Client-side scikit-learn via WebAssembly
- scikit-learn – Accessible and efficient ML tools

Privacy-first, offline-capable, and built for clarity in chaotic times.
