# What To Do Next

This file explains how AgriSense AI Rover works and what should be done next to make it production-ready.

## How The App Works

AgriSense AI Rover is an offline-first PWA. The frontend runs in the browser and stores operational data locally, so the app continues working without internet.

Main flow:

1. Open the app.
2. Choose a local role: Farmer, Admin, or Researcher.
3. Create a field from the Fields page.
4. Start a survey from the Survey page.
5. The app collects rover readings from `/api/live`.
6. If the backend is unavailable, local mock mode generates readings so offline testing still works.
7. Every sample is saved immediately to IndexedDB.
8. View sample heatmaps on the Map page.
9. Run local AI analysis on the AI Analysis page.
10. Export reports as CSV or print-to-PDF from the Reports page.
11. Backup or restore the local database from Settings.

## Local Data Storage

The local database is defined in:

```text
src/lib/db.ts
```

It uses Dexie.js over IndexedDB and stores:

- users
- fields
- surveys
- readings
- settings
- notifications

The database initializer creates only required local role profiles and default settings. It does not create demo fields, demo surveys, or demo readings.

## Offline Support

Offline support is handled by:

```text
public/sw.js
public/manifest.webmanifest
src/lib/db.ts
```

The service worker caches the app shell and static files. IndexedDB stores survey data. This means field creation, survey capture, maps, AI analysis, reports, backup, and restore continue to work offline.

## Rover Data

The rover service is here:

```text
src/services/rover.ts
```

The mock backend endpoint is here:

```text
server/index.js
```

Current endpoint:

```http
GET /api/live
```

Expected sensor values:

- nitrogen
- phosphorus
- potassium
- moisture
- temperature
- EC
- pH
- GPS
- time

For a real ESP32 rover, replace or extend `/api/live` so it reads from the rover over WiFi, Bluetooth, or another local bridge.

## Sync

Sync logic is currently local and optional:

```text
src/services/sync.ts
```

At the moment, "Sync Now" marks local records as synced when the browser is online. For production, connect this service to a real backend endpoint that writes to MongoDB.

Recommended sync tasks:

1. Add user/project IDs to each record.
2. Add conflict handling for edited fields.
3. Add a real `/api/sync` backend route.
4. Store synced records in MongoDB.
5. Add retry handling for failed sync batches.
6. Show sync history in Settings.

## AI Module

AI recommendation logic is currently local and rule-based:

```text
src/lib/calculations.ts
```

This lets the app work fully offline. Later, a cloud or local AI endpoint can replace the rule-based function while keeping the same UI.

Recommended AI tasks:

1. Define the request and response schema.
2. Add `/api/ai/recommendation`.
3. Keep local rule-based AI as offline fallback.
4. Add crop-specific fertilizer rules.
5. Add confidence scores and agronomist notes.

## Map

The Map page uses a custom SVG heatmap instead of external map tiles. This keeps the map reliable offline.

Map code is in:

```text
src/App.tsx
```

Recommended map tasks:

1. Add exportable heatmap images.
2. Add interpolation between sample points.
3. Add boundary import from GPS/KML/GeoJSON.
4. Add field zones and treatment recommendations.

## Production Checklist

Before deploying commercially:

1. Replace local role selection with secure authentication.
2. Connect ESP32 live data to `/api/live`.
3. Add MongoDB-backed cloud sync.
4. Add validation for all field and survey inputs.
5. Add automated tests for calculations, database actions, and sync.
6. Add code splitting to reduce the production bundle size.
7. Add deployment workflow for the frontend and backend.
8. Add privacy policy and data ownership terms.
9. Test install/offline behavior on Android, iOS, desktop Chrome, and Edge.

## Useful Commands

Install dependencies:

```bash
npm install
```

Run frontend:

```bash
npm run dev
```

Run backend:

```bash
npm run server
```

Run both:

```bash
npm start
```

Build:

```bash
npm run build
```
