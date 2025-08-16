"**Problem**: React wizard needs to communicate with backend services. **Tasks**: Wire wizard to create/import endpoints; Add status polling for async operations; Implement real-time progress updates; Add error state handling; Create loading indicators; Add success confirmation screens. **Acceptance Criteria**: Wizard calls backend APIs successfully; Real-time status updates displayed; Error states handled gracefully; User feedback on completion."


Game Wizard

Create/import games, poll backend status in real time, show progress and success, and handle errors gracefully. Built for a clean demo and easy hand-off to a real backend.

✨ What you get

Create & Import flows wired to backend endpoints

Polling for async job status with exponential backoff and timeout

Smooth progress bar & loading indicators

Clear error states and success confirmations (toasts)

A simple list view with refresh and delete

✅ Acceptance Criteria (mapped)

Wizard calls backend APIs successfully → apiService.js + .env base URL

Real-time status updates displayed → usePoll hook + progress bar

Error states handled gracefully → guarded UI states + error banners + retry/cancel

User feedback on completion → toast notifications + success stripe

1) Tech stack

React 18 (Create React App or Vite – CRA assumed below)

Axios for HTTP

Custom usePoll hook for polling (with backoff, jitter, timeout)

Lightweight toast provider (no external dependency)

2) Project structure
game-wizard/
  ├─ public/
  ├─ src/
  │  ├─ components/
  │  │  ├─ CreatePanel.jsx
  │  │  ├─ ImportPanel.jsx
  │  │  ├─ ListPanel.jsx
  │  │  └─ ToastProvider.jsx
  │  ├─ hooks/
  │  │  └─ usePoll.js
  │  ├─ services/
  │  │  └─ apiService.js
  │  ├─ analytics/               (optional demo)
  │  │  └─ client.js
  │  ├─ App.js
  │  ├─ App.css
  │  └─ index.js
  ├─ .env                        ← frontend env vars
  ├─ package.json
  └─ README.md

3) Getting started
Prereqs

Node 18+ and npm

A backend endpoint. For demos we use MockAPI (free). You can switch to a real API with one env var.

3.1 Clone & install
git clone <your-repo-url> game-wizard
cd game-wizard
npm install

3.2 Configure the API base URL

Create a .env in the project root:

# For MockAPI (example):
REACT_APP_API_BASE=https://689b95b558a27b18087bb9c4.mockapi.io/games/games

# Optional (only if you also run the tiny analytics demo):
# REACT_APP_ANALYTICS_BASE=http://localhost:4000


Note: Restart npm start whenever you change .env.

3.3 Start the app
npm start


The app runs at http://localhost:3000.

4) How to use (demo flow)

Create

Enter a name → click Create

The app creates a record with status: 'queued', progress: 0 and polls until completed (or progress:100).

You’ll see progress bar, status label, Cancel/Retry if needed, and a success toast.

Import

Choose a small JSON file (optional: { "name": "my-game" }).

Click Import → a new queued item is created and progressed.

All Games

Click Refresh to fetch latest.

Delete removes an item.

Everything logs helpful messages in DevTools (Network + Console) for debugging.

5) Configuration details
5.1 API contract expected by the UI

Create: POST /
Body: { name, status:'queued', progress:0 }
Returns: { id, ... }

Import: (same as create for the mock) POST /
Returns: { id, ... }

Get status (poll): GET /:id
Returns: { id, name, status: 'queued'|'processing'|'completed'|'failed', progress: 0..100 }

List: GET / → [ { id, name, status, progress }, ... ]

Update (used by demo simulator): PUT /:id

Delete: DELETE /:id

The MockAPI route path must match the resource you created (e.g., /games/games).
If your MockAPI path is different, set it in REACT_APP_API_BASE.

5.2 Switch to a real backend later

Change .env:

REACT_APP_API_BASE=http://localhost:8080/api/games


Ensure your backend implements the endpoints above (or adjust apiService.js accordingly).

Restart npm start.

6) Key files (what they do)
src/services/apiService.js

Wraps Axios with base URL and a light request throttle (reduces 429s on free tiers)

Exposes: createGame, importGame, getGame, updateGame, listGames, deleteGame

Includes a small simulateServerWork(id) helper (demo only) that increments progress server-side by calling PUT /:id

src/hooks/usePoll.js

Generic polling hook with:

Exponential backoff on 429/503

Retry-After header support

Jitter to avoid bursts

Timeout and stopWhen guard

Abortable requests (passes an AbortSignal to your fn)

src/components/CreatePanel.jsx

Form to create a job

Starts polling when a new ID returns

Shows progress bar & status

Error → banner + Retry/Cancel

Success → toast + auto-reset + calls onDone() (to refresh list)

src/components/ImportPanel.jsx

Reads a file, creates a queued job, and starts demo progress via simulateServerWork()

Success → toast + onDone()

src/components/ListPanel.jsx

Displays all games with meta (status, progress)

Refresh & Delete

src/components/ToastProvider.jsx

Tiny toast system (useToast().push("message", "success|error|info"))

Auto-dismiss with click to dismiss

7) Styling

Minimal CSS in App.css using utility classes:

.gw-card, .gw-btn, .gw-btn-dark, .gw-btn-danger

.gw-progress-wrap, .gw-progress

.gw-toast, .gw-toast-success, .gw-toast-error

Dark & light themes are easy to toggle by changing root colors.

8) Optional: Analytics demo (5 min)

You can optionally track page views, button clicks, and completions into a tiny Express + MongoDB server with a one-page dashboard.
Steps are in analytics-server/README (or ask your teammate who ran it). TL;DR: start analytics-server (port 4000), set REACT_APP_ANALYTICS_BASE, and the app will POST events to /events.

9) Troubleshooting

429 / “Too Many Requests” / “net::ERR_INSUFFICIENT_RESOURCES”

The Axios client is throttled; if you still see this, refresh less, or increase MIN_GAP in apiService.js.

404 (MockAPI)

Double-check the resource path in your MockAPI URL matches .env REACT_APP_API_BASE.

Polling doesn’t stop

Ensure your backend returns status: 'completed' or progress: 100.

Environment changes don’t apply

Restart npm start after editing .env.

10) Demo script (5 minutes)

Landing → “Create/import → poll status → success” shown at top.

Create → enter a name, click Create → progress updates in real time → toast shows success → list refreshes.

Import → pick a small JSON → click Import → same progress path (simulated) → success toast.

List → click Refresh, then Delete an item → toast “Deleted”.

(Optional) Open DevTools → Network → show API calls & polling intervals.
