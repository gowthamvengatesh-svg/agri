# AgriSense AI Rover

AgriSense AI Rover is an offline-first Progressive Web App for rover-based agricultural field surveys. It is built for farmers, admins, and researchers who need to collect soil samples, view field maps, generate reports, and run local AI-style recommendations without depending on internet access.

## Features

- Offline-first PWA with service worker, manifest, local caching, and install support
- Local authentication with Farmer, Admin, and Researcher roles
- IndexedDB storage using Dexie.js for fields, surveys, sensor readings, settings, and notifications
- Dashboard with survey metrics, rover status, battery status, soil health, and sync state
- Field management with automatic area, sampling point, survey time, and battery estimation
- Rover survey workflow with mock/WiFi/Bluetooth modes, live readings, progress, pause, resume, and stop
- Soil parameters for NPK, moisture, temperature, EC, pH, GPS, time, and soil health score
- Offline SVG field heatmap with local sample points and heat coloring
- AI analysis module with fertilizer recommendation, crop suitability, deficiency detection, and soil health score
- Reports with charts, survey summary, CSV export, and print-to-PDF export
- Settings for sampling distance, units, dark mode, offline sync, backup, restore, and language
- Modern Apple-inspired glassmorphism UI with responsive desktop, tablet, and mobile layouts

## Tech Stack

Frontend:

- React
- Vite
- TypeScript
- TailwindCSS
- Framer Motion
- Recharts
- Dexie.js

Backend:

- Node.js
- Express

PWA:

- Service worker
- Web app manifest
- Offline asset caching
- Installable app shell

## Getting Started

Install dependencies:

```bash
npm install
```

Run the frontend development server:

```bash
npm run dev
```

Run the mock backend:

```bash
npm run server
```

Or run both together:

```bash
npm start
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4100`

## Build

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Offline Behavior

The application is designed to continue working without internet access.

Data is stored locally in IndexedDB:

- Users
- Fields
- Surveys
- Sensor readings
- Settings
- Notifications

The service worker caches the app shell and static assets so the UI remains available offline. Survey data is auto-saved locally. When the device comes back online, the Settings page shows pending sync records and allows manual sync.

On first run, the app creates only local role profiles and default settings. It does not create demo fields, demo surveys, or demo readings.

Cloud synchronization is currently implemented as a local placeholder and can be connected to MongoDB later.

## Mock Rover API

The Express backend provides a mock rover endpoint:

```http
GET /api/live
```

Example response:

```json
{
  "NPK": {
    "nitrogen": 69,
    "phosphorus": 45,
    "potassium": 142
  },
  "moisture": 35,
  "temperature": 24,
  "EC": 2.5,
  "ph": 6.5,
  "gps": {
    "lat": 17.3909,
    "lng": 78.4916
  },
  "time": "2026-07-14T14:51:36.677Z",
  "mode": "mock"
}
```

If the backend is unavailable, the frontend automatically falls back to local mock sensor readings.

## Project Structure

```text
src/
  App.tsx
  main.tsx
  styles.css
  lib/
    calculations.ts
    db.ts
    hooks.ts
  services/
    backup.ts
    export.ts
    rover.ts
    sync.ts
  types.ts
public/
  manifest.webmanifest
  sw.js
  icons/
server/
  index.js
```

## Keyboard Shortcuts

- `Alt + D`: Dashboard
- `Alt + F`: Fields
- `Alt + N`: Survey

## Notes

- The map is intentionally offline-friendly and does not rely on remote map tiles.
- The AI module currently uses local rule-based recommendations and is structured so a future REST AI endpoint can replace it.
- PDF export uses the browser print flow.
- MongoDB sync is optional and left as a future backend integration point.
