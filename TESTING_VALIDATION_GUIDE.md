# 🧪 Testing & Validation Guide

## **13/15 Tasks Complete (87%)**

This guide covers end-to-end testing for the production AgriSense AI Rover platform.

---

## 📋 Test Scenarios

### **Test Suite 1: Authentication & Authorization**

#### 1.1 User Registration
```bash
# Test: Create new user account
curl -X POST http://localhost:4100/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@agrisense.com",
    "password": "SecurePass123!",
    "name": "John Farmer",
    "role": "Farmer"
  }'

# Expected:
# {
#   "user": { "uid": "user-123", "email": "...", "role": "Farmer" },
#   "token": "eyJhbGc..."
# }

# Test: Verify user created in Firestore
# - Check users collection has new document
# - Settings initialized with defaults
# - Role stored correctly
```

#### 1.2 User Login
```bash
# Test: Login with Firebase
# In frontend:
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './lib/firebase';

const user = await signInWithEmailAndPassword(auth, 'farmer@agrisense.com', 'SecurePass123!');
// Verify: user.user.uid exists
// Verify: Local token storage works
```

#### 1.3 Token Verification
```bash
# Test: API call with valid token
curl -X GET http://localhost:4100/api/settings \
  -H "Authorization: Bearer <VALID_TOKEN>"

# Expected: 200 OK with settings

# Test: API call with invalid token
curl -X GET http://localhost:4100/api/settings \
  -H "Authorization: Bearer invalid-token"

# Expected: 401 Unauthorized
```

#### 1.4 Role-Based Access Control
```bash
# Test: Farmer can access own settings
# Farmer user calls: GET /api/settings
# Expected: 200 OK

# Test: Farmer cannot access other user's settings
# Farmer user calls: GET /api/survey/<ANOTHER_FARMER_ID>
# Expected: 403 Forbidden

# Test: Admin can access all surveys
# Admin user calls: GET /api/history/surveys?limit=100
# Expected: 200 OK with all surveys
```

---

### **Test Suite 2: Sensor Data Reception**

#### 2.1 ESP32 POST to Backend
```bash
# Test: Valid sensor data from ESP32
curl -X POST http://localhost:4100/api/sensor/live \
  -H "Content-Type: application/json" \
  -d '{
    "nitrogen": 45,
    "phosphorus": 20,
    "potassium": 39,
    "moisture": 58,
    "temperature": 28,
    "ec": 1.2,
    "ph": 7.1,
    "battery": 81,
    "gps": {
      "lat": 17.3850,
      "lng": 78.4867
    },
    "surveyId": "survey-123",
    "fieldId": "field-456"
  }'

# Expected:
# {
#   "success": true,
#   "reading": { "id": "reading-789", "timestamp": "...", ... }
# }

# Verify:
# 1. HTTP 200 OK response
# 2. Reading saved in Firestore/sensorReadings
# 3. Socket.IO broadcasts to connected clients
```

#### 2.2 Invalid Data Validation
```bash
# Test: Missing required field
curl -X POST http://localhost:4100/api/sensor/live \
  -H "Content-Type: application/json" \
  -d '{ "nitrogen": 45 }'

# Expected: 400 Bad Request with validation error

# Test: Invalid data type
curl -X POST http://localhost:4100/api/sensor/live \
  -H "Content-Type: application/json" \
  -d '{ "battery": "not_a_number", ... }'

# Expected: 400 Bad Request

# Test: Out of range values
curl -X POST http://localhost:4100/api/sensor/live \
  -H "Content-Type: application/json" \
  -d '{
    "battery": 150,  # max 100
    ...
  }'

# Expected: 400 Bad Request
```

#### 2.3 Real-time Socket.IO Broadcast
```javascript
// Frontend test
import io from 'socket.io-client';

const socket = io('http://localhost:4100');

socket.on('connect', () => {
  console.log('✓ Connected to WebSocket');
  
  socket.emit('subscribe:sensor', { fieldId: 'field-456' });
  console.log('✓ Subscribed to sensor:field-456 room');
});

socket.on('sensor:reading', (data) => {
  console.log('✓ Received real-time reading:', data);
  // Verify: data.nitrogen, moisture, battery are present
  // Verify: timestamp is current
  // Verify: GPS coordinates are valid
});

socket.on('disconnect', () => {
  console.log('✓ Disconnected from WebSocket');
});
```

---

### **Test Suite 3: Survey Management**

#### 3.1 Start Survey
```bash
# Test: Start new survey
curl -X POST http://localhost:4100/api/rover/survey/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "fieldId": "field-123",
    "roverId": "primary",
    "sampleCount": 10
  }'

# Expected:
# {
#   "survey": {
#     "id": "survey-xyz",
#     "status": "running",
#     "fieldId": "field-123",
#     "startedAt": "2024-01-15T10:30:00Z",
#     "batteryStart": 85
#   }
# }

# Verify:
# 1. Survey created in Firestore/surveys
# 2. Status is "running"
# 3. Socket.IO broadcasts survey:started event
# 4. Dashboard shows active survey
```

#### 3.2 Submit Sensor Reading During Survey
```bash
# Test: Send reading while survey is active
curl -X POST http://localhost:4100/api/sensor/live \
  -H "Content-Type: application/json" \
  -d '{
    "surveyId": "survey-xyz",
    "fieldId": "field-123",
    "nitrogen": 45,
    "moisture": 58,
    "battery": 81,
    ...
  }'

# Expected: Reading linked to survey

# Verify:
# 1. Reading in Firestore with survey ID
# 2. Dashboard chart updates in real-time
# 3. Sample count increments
```

#### 3.3 Pause & Resume Survey
```bash
# Test: Pause survey
curl -X POST http://localhost:4100/api/rover/survey/pause \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{ "surveyId": "survey-xyz", "roverId": "primary" }'

# Expected: survey.status = "paused"

# Test: Resume survey
curl -X POST http://localhost:4100/api/rover/survey/resume \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{ "surveyId": "survey-xyz", "roverId": "primary" }'

# Expected: survey.status = "running"
```

#### 3.4 Stop Survey
```bash
# Test: Stop survey
curl -X POST http://localhost:4100/api/rover/survey/stop \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{ "surveyId": "survey-xyz", "roverId": "primary" }'

# Expected:
# {
#   "survey": {
#     "status": "completed",
#     "endedAt": "2024-01-15T11:45:00Z",
#     "batteryEnd": 65,
#     "sampleCount": 42
#   }
# }

# Verify:
# 1. Survey marked as completed
# 2. Statistics calculated
# 3. Report available in Reports page
```

---

### **Test Suite 4: Manual Rover Control**

#### 4.1 Forward Command
```bash
# Test: Send forward command
curl -X POST http://localhost:4100/api/rover/manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "roverId": "primary",
    "command": "forward",
    "duration": 5
  }'

# Expected: Command queued

# Verify:
# 1. Command in Firestore/commands with status "pending"
# 2. Once executed, status changes to "completed"
# 3. Rover status shows movement
```

#### 4.2 All Manual Commands
```bash
# Test each command:
# - forward, backward, left, right, stop, home

const commands = ['forward', 'backward', 'left', 'right', 'stop', 'home'];

for (const cmd of commands) {
  const response = await fetch('http://localhost:4100/api/rover/manual', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      roverId: 'primary',
      command: cmd,
      duration: 2
    })
  });
  
  console.log(`✓ ${cmd}: ${response.status === 200 ? 'OK' : 'FAILED'}`);
}
```

---

### **Test Suite 5: Reports & Export**

#### 5.1 CSV Export
```javascript
// Test: Generate and download CSV
import { generateCSV, downloadCSV } from './services/history';

const readings = [
  { pointIndex: 1, nitrogen: 45, phosphorus: 20, potassium: 39, moisture: 58, ... },
  { pointIndex: 2, nitrogen: 48, phosphorus: 22, potassium: 41, moisture: 60, ... }
];

const field = { name: 'North Field', crop: 'Wheat' };
const survey = { id: 'survey-123', status: 'completed', ... };

const csv = generateCSV(readings, field, survey);
downloadCSV('report.csv', csv);

// Verify:
// 1. CSV file downloads
// 2. Contains headers (Point, Nitrogen, Phosphorus, ...)
// 3. Contains statistics (Average, Min, Max)
// 4. Data is comma-separated
```

#### 5.2 PDF Export
```javascript
// Test: Generate PDF
import { exportPDF } from './services/export';

const readings = [...];
const field = { name: 'North Field', crop: 'Wheat' };
const survey = { id: 'survey-123', status: 'completed', ... };

exportPDF(field, survey, readings);

// Verify:
// 1. PDF opens in print dialog
// 2. Contains field name and crop
// 3. Shows table of readings
// 4. Includes statistics and recommendations
```

#### 5.3 Reports Page
```javascript
// Test: Load reports page
// 1. Navigate to Reports tab
// 2. See list of completed surveys
// 3. Search by field name
// 4. Click CSV export
// 5. Click PDF export
// 6. Verify charts show NPK trends
```

---

### **Test Suite 6: Settings Integration**

#### 6.1 Get Settings
```bash
# Test: Fetch user settings
curl -X GET http://localhost:4100/api/settings \
  -H "Authorization: Bearer <TOKEN>"

# Expected:
# {
#   "userId": "user-123",
#   "settings": {
#     "samplingDistance": 5,
#     "units": "Metric",
#     "darkMode": false,
#     "esp32IP": "192.168.1.100",
#     "wifiMode": "WiFi",
#     "autoConnect": true
#   }
# }
```

#### 6.2 Update Settings
```bash
# Test: Update sampling distance
curl -X PUT http://localhost:4100/api/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{ "samplingDistance": 10 }'

# Expected: 200 OK with updated settings

# Verify:
# 1. Settings updated in Firestore
# 2. Visible in Settings page
# 3. Persists across browser refresh
```

#### 6.3 ESP32 IP Configuration
```bash
# Test: Set ESP32 IP
curl -X PUT http://localhost:4100/api/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{ "esp32IP": "192.168.1.100" }'

# Expected: 200 OK

# Verify:
# 1. IP validated (must be valid IP format)
# 2. Stored in Firestore
# 3. Available in Settings page
```

#### 6.4 WiFi Mode
```bash
# Test: Change WiFi mode
curl -X PUT http://localhost:4100/api/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{ "wifiMode": "Bluetooth" }'

# Expected: 200 OK
# Verify: Stored and displayed in Settings
```

---

### **Test Suite 7: Real-time Features**

#### 7.1 Multi-Client Sync
```javascript
// Open two browser windows
// Window 1: Navigate to Dashboard
// Window 2: Start survey

// Send test sensor data:
curl -X POST http://localhost:4100/api/sensor/live \
  -H "Content-Type: application/json" \
  -d '{ "nitrogen": 45, "moisture": 58, ... }'

// Verify:
// Both windows show updated values instantly
// Charts update in real-time
// No page refresh needed
```

#### 7.2 Connection Status Indicator
```javascript
// In Dashboard:
// 1. Green dot shows when Socket.IO connected
// 2. Red dot shows when disconnected
// 3. Auto-reconnects after network interruption

// To test:
// 1. Open DevTools Network tab
// 2. Throttle connection
// 3. Watch status indicator change
```

#### 7.3 Survey Event Broadcast
```javascript
// Start survey in one tab
// Other tabs should see:
// 1. Active survey indicator appears
// 2. Survey status updates live
// 3. Sample count increases as readings arrive
```

---

### **Test Suite 8: Error Handling**

#### 8.1 Network Errors
```javascript
// Test 1: Server down
// Stop backend server
// Try to load dashboard
// Verify: Shows "Unable to connect" error

// Test 2: Slow network
// Throttle to 3G
// Try CSV export
// Verify: Shows loading state, then completes
```

#### 8.2 Invalid Input
```bash
# Test: Send garbage to API
curl -X POST http://localhost:4100/api/sensor/live \
  -H "Content-Type: application/json" \
  -d 'not valid json'

# Expected: 400 Bad Request

# Test: Empty survey list
# Create user with no surveys
# Navigate to Reports
# Verify: Shows "No surveys" message
```

#### 8.3 Permission Denied
```bash
# Test: User can't modify other user's survey
# User A creates survey
# User B tries to stop User A's survey
# Expected: 403 Forbidden
```

---

### **Test Suite 9: Data Persistence**

#### 9.1 Firestore Consistency
```bash
# Test: Data survives reload
# 1. Start survey
# 2. Send readings
# 3. Refresh browser
# 4. Verify: Survey and readings still visible

# Test: Data syncs across devices
# 1. Start survey on Phone
# 2. Open Dashboard on Tablet
# 3. Both should show same data in real-time
```

#### 9.2 Settings Persistence
```javascript
// Test: Settings saved across sessions
// 1. Change theme to dark
// 2. Close and reopen browser
// 3. Verify: Dark mode still active

// Test: Settings sync across tabs
// 1. Open Settings page in Tab A
// 2. Change language to Hindi in Tab B
// 3. Tab A should auto-update
```

---

### **Test Suite 10: Performance & Load**

#### 10.1 Large Dataset Handling
```bash
# Test: Load 10,000 readings
# 1. Create survey with 10,000 sample points
# 2. Send 10,000 readings via API
# 3. Verify: Reports page still responsive
# 4. CSV export completes in <5 seconds
```

#### 10.2 Concurrent Users
```bash
# Test: 10 simultaneous users
# Use Apache JMeter or similar
# 10 users logging in simultaneously
# 10 users polling /api/rover/status
# Verify: No errors, <200ms response time
```

---

## 🧪 Manual Testing Checklist

### Frontend Tests
```
☐ Authentication
  ☐ Register new user
  ☐ Login with email
  ☐ Logout clears token
  ☐ Invalid credentials show error
  ☐ Token persists on refresh

☐ Dashboard
  ☐ Shows live NPK values
  ☐ Battery percentage updates
  ☐ GPS coordinates display
  ☐ Connection status shows
  ☐ Socket indicator green when connected
  ☐ Low battery alert appears

☐ Survey Page
  ☐ Select field from dropdown
  ☐ Start survey button works
  ☐ Timer counts up
  ☐ Pause button pauses timer
  ☐ Resume button resumes
  ☐ Stop button completes survey
  ☐ Live readings update in real-time

☐ Rover Page
  ☐ Forward button sends command
  ☐ Backward button sends command
  ☐ Left button sends command
  ☐ Right button sends command
  ☐ Stop button sends command
  ☐ Home button sends command
  ☐ Rover status displays

☐ Reports Page
  ☐ Filter by field name works
  ☐ CSV export downloads file
  ☐ PDF opens in print dialog
  ☐ Chart shows NPK trends
  ☐ Statistics calculated correctly

☐ Settings Page
  ☐ Sampling distance saved
  ☐ Units preference saved
  ☐ Dark mode toggle works
  ☐ ESP32 IP saved
  ☐ WiFi mode changed
  ☐ Settings persist on refresh
  ☐ Settings sync across tabs

☐ Responsive Design
  ☐ Works on mobile (375px)
  ☐ Works on tablet (768px)
  ☐ Works on desktop (1920px)
  ☐ Buttons clickable on touch
```

### Backend Tests
```
☐ Authentication Routes
  ☐ POST /api/auth/register works
  ☐ POST /api/auth/login works
  ☐ Invalid credentials rejected
  ☐ Tokens verified correctly

☐ Sensor Routes
  ☐ POST /api/sensor/live accepts data
  ☐ Validates all required fields
  ☐ Stores in Firestore
  ☐ Broadcasts to Socket.IO

☐ Rover Routes
  ☐ POST /api/rover/manual queues commands
  ☐ POST /api/rover/survey/start creates survey
  ☐ POST /api/rover/survey/stop completes survey
  ☐ POST /api/rover/survey/pause works
  ☐ POST /api/rover/survey/resume works

☐ History Routes
  ☐ GET /api/history/surveys returns surveys
  ☐ GET /api/history/survey/:id returns details
  ☐ GET /api/history/survey/:id/export/csv works

☐ Settings Routes
  ☐ GET /api/settings returns user settings
  ☐ PUT /api/settings updates settings
  ☐ Validates IP address format
  ☐ Validates WiFi mode values

☐ Socket.IO
  ☐ Clients can connect
  ☐ subscribe:sensor works
  ☐ subscribe:rover works
  ☐ sensor:reading broadcasts
  ☐ survey:started broadcasts
  ☐ survey:stopped broadcasts
```

---

## 🚀 Integration Testing Workflow

### Step 1: Environment Setup (5 min)
```bash
# 1. Firebase Project
# - Create project at console.firebase.google.com
# - Enable Firestore
# - Enable Authentication (Email/Password)
# - Download service account JSON
# - Get web config

# 2. Local Setup
cp .env.example .env
cp .env.local.example .env.local

# Fill in Firebase credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=...
VITE_FIREBASE_API_KEY=...
VITE_API_URL=http://localhost:4100/api
```

### Step 2: Start Services (5 min)
```bash
# Terminal 1: Backend
cd server
npm install
node index.js
# Verify: "listening on http://0.0.0.0:4100"

# Terminal 2: Frontend
npm install
npm run dev
# Verify: "VITE v5.0.0 ready in 150 ms"
```

### Step 3: Run Test Suite 1-2 (10 min)
```bash
# 1. Register new user via UI
# 2. Send test sensor data via curl
# 3. Verify appears in Dashboard in real-time

# Expected result: ✅ Auth + Sensors working
```

### Step 4: Run Test Suite 3-4 (15 min)
```bash
# 1. Start survey from UI
# 2. Send multiple readings via curl
# 3. Pause and resume
# 4. Send manual commands
# 5. Stop survey

# Expected result: ✅ Survey + Rover control working
```

### Step 5: Run Test Suite 5-6 (10 min)
```bash
# 1. Export report as CSV
# 2. Export as PDF
# 3. Update settings
# 4. Change ESP32 IP
# 5. Verify persisted

# Expected result: ✅ Reports + Settings working
```

### Step 6: Run Test Suite 7-10 (20 min)
```bash
# 1. Open two browser windows
# 2. Disconnect one from network
# 3. Send data, verify both sync
# 4. Reconnect and verify recovery

# Expected result: ✅ Real-time + Resilience working
```

---

## 📊 Testing Report Template

```markdown
# AgriSense AI Rover - Testing Report
Date: 2024-01-15
Tester: John Engineer
Duration: 2 hours

## Test Results Summary
- Total Tests: 47
- Passed: 45 ✅
- Failed: 2 ❌
- Skipped: 0

## Passed Tests
✅ Authentication & Authorization (8/8)
✅ Sensor Data Reception (6/6)
✅ Survey Management (8/8)
✅ Manual Rover Control (6/6)
✅ Reports & Export (6/6)
✅ Real-time Features (5/5)
✅ Error Handling (4/4)

## Failed Tests
❌ Test: Large Dataset (10,000 readings)
   Error: Reports page slow >5 seconds
   Status: Will fix with pagination

❌ Test: Concurrent 10 users
   Error: 2 users got 503 Service Unavailable
   Status: Will add load balancing

## Next Steps
1. Add pagination to reports
2. Implement query caching
3. Load test with 50 concurrent users
4. Performance profiling

## Sign-off
- [ ] Ready for staging
- [ ] Ready for production
```

---

## ✅ Pre-Deployment Checklist

Before deploying to production:

```
Backend
☐ All tests passing
☐ No console errors
☐ Firebase credentials secured in .env
☐ CORS properly configured
☐ Error handling comprehensive
☐ Firestore indexes created
☐ Rate limiting enabled
☐ Logging configured
☐ Backups working
☐ Security rules tested

Frontend
☐ All tests passing
☐ No console warnings
☐ Build succeeds without errors
☐ Environment variables correct
☐ Service worker configured
☐ Offline mode works
☐ Mobile responsive
☐ Accessibility tested
☐ Performance analyzed
☐ Error tracking configured

Deployment
☐ Database migrated
☐ SSL certificates ready
☐ CDN configured
☐ Monitoring set up
☐ Alerts configured
☐ Rollback plan documented
☐ User communication sent
☐ Team trained
☐ Support ready
☐ Post-deploy checklist ready
```

---

## 🎯 Success Criteria

The platform is production-ready when:

✅ **Stability**: 99.9% uptime, <200ms API response times  
✅ **Reliability**: All 47 tests passing consistently  
✅ **Security**: All role-based access controls enforced  
✅ **Real-time**: <100ms sensor data propagation  
✅ **Data**: No lost sensor readings ever  
✅ **UX**: Responsive, intuitive, error messages helpful  
✅ **Performance**: CSV export <5s, PDF <3s  
✅ **Documentation**: Complete API + user guides  

---

**Next Phase**: Deploy to production with continuous monitoring! 🚀

