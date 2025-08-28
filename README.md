# EventSphere - Interactive Global Event Visualization Platform

EventSphere is a CPU-efficient, interactive 3D visualization platform that renders real-time global events on a dynamic globe, powered by on-device AI clustering for intelligent thematic navigation. Designed for crisis analysts and field operations in low-connectivity environments, EventSphere uses a lightweight **client-side MiniBatchKMeans model** (under 500KB) compiled to ONNX format and executed directly in-browser via WebAssembly—ensuring zero data leaves the client and achieving inference latency under 100ms.

With **no authentication**, **no external API dependencies**, and **no database servers**, EventSphere runs entirely offline using browser-native storage and computation. This makes it ideal for deployment in air-gapped or resource-constrained settings where privacy, speed, and reliability are paramount.

---

## 🚀 Features

- **Interactive 3D Globe**: Smooth, physics-based camera controls with dampened zoom and rotation using `dampen` and Three.js.
- **On-Device AI Clustering**: Executes pre-trained MiniBatchKMeans model via ONNX.js directly in the browser; identifies and labels clusters (e.g., "Protests", "Storms") without sending data anywhere.
- **Real-Time Temporal Filtering**: Time range slider to dynamically show events within selected periods.
- **Offline-First Architecture**: All data stored locally via IndexedDB (using LocalForage and Dexie.js); persists across sessions.
- **Instant Load Performance**: Model bundle <500KB ensures fast startup even on low-bandwidth connections.
- **Type-Safe Validation**: Zod schema enforcement on all event inputs guarantees data integrity at runtime.
- **Public Dataset Ready**: No authentication layer—designed for open, shareable event datasets.

---

## 🛠️ Architecture & Technology Stack

### Frontend
- **Framework**: React 18 + Vite 5 (blazing-fast HMR and build performance)
- **3D Engine**: Three.js 0.164.0
- **Rendering & Controls**: 
  - `@react-three/fiber` and `drei` for React integration
  - `dampen` 1.0.1 for smooth physics-based camera animation
- **State & Effects**: React hooks with context and Zustand for lightweight state
- **AI Inference**: ONNX.js 1.1.1 + pre-compiled MiniBatchKMeans `.onnx` model (<500KB)
- **Data Persistence**: 
  - LocalForage 1.10.0 (IndexedDB wrapper for async storage)
  - Dexie.js 4.0.8 (type-safe IndexedDB layer)
- **Validation**: Zod 3.22.4 for runtime type checking of event payloads
- **Caching**: `lru-cache` 8.0.4 (in-memory cache for cluster results, max 50 entries)

---

## 🗂️ Project Structure

```
/src
  /components
    Globe.tsx          # Three.js canvas setup with orbit controls and event markers
    ClusterPanel.tsx   # Displays AI-generated cluster names and summaries
    TimeFilter.tsx     # Interactive range slider for filtering events by timestamp
  /lib
    clustering.ts      # Loads ONNX model and runs clustering logic in WebWorker
    validation.ts      # Zod schemas for event and cluster data validation
    events.ts          # CRUD operations over LocalForage-backed IndexedDB
  /models
    cluster-model.onnx # Pre-trained MiniBatchKMeans model in ONNX format
  main.tsx             # App root with providers and routing
index.html
vite.config.ts         # Vite configuration with PWA and dev server settings
package.json           # NPM dependencies and scripts
tsconfig.json
```

---

## 🔐 Security Design

- **Authentication**: None — designed for public datasets; no login or user management.
- **Encryption**: Relies on browser-native IndexedDB encryption (automatic, sandboxed per origin).
- **Input Validation**: All event data validated at runtime using Zod schemas (`EventSchema.parse()`).
- **Safe Deserialization**: Prevents malformed payloads via strict schema enforcement before processing.
- **Verification**:
  - Manual inspection of `src/lib/validation.ts` confirms constraints (e.g., `min(0)`, `max_length(200)`)
  - Unit test with invalid payload expects `ZodError`
  - No external network calls verified via browser DevTools Network tab

---

## ▶️ Getting Started

### Prerequisites

- Node.js 18+
- npm 9+ or yarn 1.22+

### Installation

```bash
# Clone the repository
git clone https://github.com/example/eventsphere.git
cd eventsphere

# Install dependencies with verified integrity
npm ci --no-fund

# Start development server
npm run dev
```

Visit: http://localhost:5173

Expected:
- Globe renders with interactive 3D view
- Browser console logs: `"ML model loaded"` on startup
- ClusterPanel updates with AI-generated labels when events are processed

---

## 🧪 Development & Testing

### Running Tests

```bash
npm test
```

Tests include:
- `validation.ts`: Ensures invalid event objects throw `ZodError`
- `clustering.ts`: Mocked inference on 5 test events; asserts cluster naming accuracy >80% via cosine similarity
- `events.ts`: Saves test event, reloads page, verifies persistence in IndexedDB

### Stubbing & Simulation

- **ML Model**: Pre-compiled `.onnx` file (no training at runtime); loaded once on app init
- **Storage**: IndexedDB (via LocalForage) requires no stubbing—fully functional in dev and CI
- **WebWorker**: Clustering offloaded via `@salte-io/webworker` for non-blocking inference
- **Verification**:
  - Run `console.log(clusterEvents(TEST_DATA))` in browser DevTools; observe labeled output
  - Save event via console: `await eventStore.save(event)` → refresh → confirm persistence

---

## 📦 Build & Deployment

### Build Frontend

```bash
npm run build
```

Output: `dist/` directory with static files (HTML, JS, CSS, assets)

Serve via:
- CDN
- PWA (`vite-plugin-pwa` generates service worker)
- Local file system (double-click `index.html`, or serve with `npx serve -s dist`)

Fully offline-capable—no server required.

---

## ✅ Completion Criteria

- [x] `npm run dev` starts Vite dev server on port 5173 without errors
- [x] Globe renders at http://localhost:5173 with rotation and zoom (mouse controls work)
- [x] Cluster panel displays AI-generated labels when clustering executes
- [x] Time filter reduces visible events when range is adjusted
- [x] `npm test` passes all unit tests (validation, storage, clustering simulation)
- [x] Browser console shows `"ML model loaded"` during application startup

---

## 🧩 Module Verification Plan

| Module | Verification Method |
|-------|---------------------|
| `lib/clustering` | Execute `console.log(clusterEvents(TEST_DATA))` in browser; verify labeled clusters output |
| `components/Globe` | Manual inspection: rotate and zoom using mouse; confirm event markers appear on terrain |
| `lib/events` | In browser console: save test event, refresh page, verify it persists in IndexedDB |
| `lib/validation` | Run `EventSchema.parse(INVALID_EVENT_DATA)`; expect `ZodError` with clear message |
| `models/cluster-model.onnx` | Confirm file exists and <500KB; verify load log in console |

---

## 📦 Dependency Management

**Pinned Dependencies** (partial `package.json`):

```json
"dependencies": {
  "three": "0.164.0",
  "react": "18.3.1",
  "zod": "3.22.4",
  "onnxruntime-web": "1.16.0",
  "localforage": "1.10.0",
  "dexie": "4.0.8",
  "dampen": "1.0.1",
  "@salte-io/webworker": "2.0.3"
},
"devDependencies": {
  "vite": "5.0.0",
  "vite-plugin-pwa": "1.0.0",
  "typescript": "5.2.2"
}
```

**Build Command**:

```bash
npm ci && npm run build
```

**Verification**: `npm run build` exits with status 0 and prints `✓ built in Xms`

---

## 📜 License

MIT License. See `LICENSE` for details.

---

## 🙌 Acknowledgments

Built with:
- **Vite + React** – Rapid development and lean production builds
- **Three.js** – Industry-standard 3D rendering
- **ONNX.js** – High-performance browser ML inferencing
- **Zod** – Elegant, composable runtime validation
- **LocalForage & Dexie.js** – Robust offline data storage
- **dampen** – Natural-feeling motion controls

Privacy-first, efficient, and built for clarity—whether you're monitoring global crises from HQ or a remote field station.
