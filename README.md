# Coy Discover

### Project description

A standalone swipe-based profile discovery and mutual matching application built as part of the Coy SDE Intern assignment.

### Current implementation status

- **Phase 1 — Project initialization and environment setup (Complete).**
- **Phase 2 — MongoDB Setup, Database Architecture, Data Models & Mock Profile Seeding (Complete).**
- **Phase 3 — Backend API Development: Feed, Swipe Processing, Mutual Matching & Privacy Enforcement (Complete).**
- **Phase 4 — Backend Hardening, Advanced API Testing, Edge Cases & Verification (Complete).**
- **Phase 5 — Frontend Foundation, Navigation, Discover Interface, Profile Cards, Matches View & API Integration (Complete).**
- **Phase 6 — Final Polish, E2E Acceptance Testing, Privacy Verification & Submission Readiness (Complete — 19/19 Suites, 135/135 Tests Passing).**

### Technology stack

- **Frontend:** React.js, Vite, JavaScript, CSS (Mobile-first responsive design)
- **Backend:** Node.js, Express.js, ES Modules
- **Database & ODM:** MongoDB, Mongoose
- **Development Tooling:** npm, concurrently, nodemon, Git

---

### Project structure

```text
coy-discover/
│
├── client/                     # Frontend React (Vite) application
│   ├── public/                 # Static public assets
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── common/         # LoadingSpinner, ErrorMessage
│   │   │   ├── layout/         # AppLayout, Header, BottomNavigation
│   │   │   ├── discover/       # ProfileCard, SwipeActions, SwipeFeedback, EmptyFeed, MatchModal
│   │   │   └── matches/        # MatchCard, EmptyMatches
│   │   ├── pages/              # Top-level view pages: HomePage, DiscoverPage, MatchesPage
│   │   ├── services/           # Frontend API layer: api.js, feedService, swipeService, matchService
│   │   ├── hooks/              # Custom React hooks: useFeed, useMatches
│   │   ├── App.jsx             # Main application component & layout state
│   │   ├── App.css             # Mobile-first design system styling & animations
│   │   ├── index.css           # Global CSS reset & variables
│   │   └── main.jsx            # Application mount point
│   ├── index.html              # HTML5 entry page
│   ├── vite.config.js          # Vite configuration with /api backend proxy
│   └── package.json            # Frontend dependencies and scripts
│
├── server/                     # Backend Node.js / Express application
│   ├── config/
│   │   ├── db.js               # MongoDB connection manager & diagnostics
│   │   └── constants.js        # Centralized app constants & demo identity
│   ├── controllers/
│   │   ├── feedController.js   # Discovery feed handler
│   │   ├── swipeController.js  # Swipe decision handler
│   │   └── matchController.js  # Matches list handler
│   ├── middleware/
│   │   ├── errorHandler.js     # Centralized error handler & status mapper
│   │   ├── notFound.js         # 404 unmapped route handler
│   │   └── validateRequest.js  # Request validation middleware
│   ├── models/
│   │   ├── Profile.js          # Profile schema, validation & indexes
│   │   ├── Swipe.js            # Directional swipe schema, compound unique index
│   │   └── Match.js            # Mutual match schema & compound unique index
│   ├── routes/
│   │   ├── feedRoutes.js       # GET /api/feed route
│   │   ├── swipeRoutes.js      # POST /api/swipe route
│   │   └── matchRoutes.js      # GET /api/matches route
│   ├── services/
│   │   ├── feedService.js      # Feed filtering & query business logic (deterministic ordering)
│   │   ├── swipeService.js     # Outgoing swipe & reciprocal match logic
│   │   ├── matchService.js     # Matches query & serialization logic (with self-healing reconciliation)
│   │   └── matchReconciliationService.js # Match failure recovery & reciprocal like reconciliation
│   ├── utils/
│   │   ├── apiResponse.js      # Standard JSON response helpers
│   │   └── asyncHandler.js     # Async controller exception wrapper
│   ├── seed/
│   │   ├── profileData.js      # 36 mock profiles & 10 designated incoming likes
│   │   └── seed.js             # Idempotent database seed script
│   ├── tests/
│   │   ├── health.test.js      # Phase 1 backend health check test
│   │   ├── e2e-proxy.test.js   # Phase 1 end-to-end Vite proxy test
│   │   ├── models.test.js      # Phase 2 Profile, Swipe & Match validation test suite
│   │   ├── seed-data.test.js   # Phase 2 seed dataset integrity & privacy audit
│   │   ├── db-integration.test.js # Phase 2 live database index & seed test suite
│   │   ├── feed.test.js        # Phase 3 Feed API test suite (12 tests)
│   │   ├── swipe.test.js       # Phase 3 Swipe API test suite (15 tests)
│   │   ├── matches.test.js     # Phase 3 Matches API & Mutual Matching test suite (9 tests)
│   │   ├── privacy.test.js     # Phase 3 Privacy & Security Enforcement suite (6 tests)
│   │   ├── api-integration.test.js # Phase 3 Full API lifecycle & persistence suite (6 tests)
│   │   ├── concurrency.test.js # Phase 4 High-concurrency & race condition test suite (6 tests)
│   │   ├── recovery.test.js    # Phase 4 Match failure recovery & reconciliation test suite (5 tests)
│   │   ├── deleted-profiles.test.js # Phase 4 Deleted profile edge cases suite (4 tests)
│   │   ├── indexes.test.js     # Phase 4 MongoDB index architecture audit suite (6 tests)
│   │   ├── feed-ordering.test.js # Phase 4 Deterministic feed ordering suite (3 tests)
│   │   ├── request-hardening.test.js # Phase 4 Request abuse & payload hardening suite (8 tests)
│   │   ├── production-errors.test.js # Phase 4 Production error sanitization suite (6 tests)
│   │   ├── privacy-regression.test.js # Phase 4 Privacy anti-leak regression suite (6 tests)
│   │   ├── persistence-hardening.test.js # Phase 4 Server restart & persistence suite (6 tests)
│   │   ├── testHelper.js       # Reusable test environment harness & server launcher
│   │   └── run-all.js          # Master test runner executing all 18 test suites
│   ├── app.js                  # Express app initialization, routing & middleware
│   ├── server.js               # HTTP server listener, DB connection & port binding
│   └── package.json            # Backend dependencies and scripts
│
├── .env.example                # Documented environment variables template
├── .gitignore                  # Git ignore rules for node_modules, logs, env, db
├── package.json                # Root package for coordinated development
└── README.md                   # Project documentation
```

---

### Prerequisites

- **Node.js** (v18.0.0 or higher recommended, verified with v24.0.0)
- **npm** (v9.0.0 or higher, verified with v11.3.0)
- **MongoDB** (Local MongoDB Community Server or MongoDB Atlas cluster)
- **Git**

---

### Installation & Environment Setup

1. Install root, frontend, and backend dependencies:
   ```powershell
   npm install
   cd client ; npm install ; cd ..
   cd server ; npm install ; cd ..
   ```

2. Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```

3. Environment Variables:
   ```env
   NODE_ENV=development
   PORT=5000
   CLIENT_ORIGIN=http://localhost:5173

   # MongoDB Connection String (Local or Atlas)
   MONGODB_URI=mongodb://127.0.0.1:27018/coy_discover

   # Fixed single-user demo identity
   DEMO_USER_ID=demo-user

   SEED_PROFILE_COUNT=35
   ```

4. Seed the database with 36 mock profiles and 10 incoming likes:
   ```powershell
   npm run seed
   ```

---

### Backend API Reference

All requests and responses use JSON. Unmapped routes return HTTP `404 Not Found`.

#### 1. `GET /api/feed`
Returns discoverable profiles that the demo user has not yet swiped on (neither liked nor passed).

- **Query Parameters:** None.
- **Privacy Guarantee:** Seeded profiles that have liked the demo user remain in the feed, but zero indication of their incoming like is returned.
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "6afe76ddf65904f676a4754b",
        "name": "Aanya Sharma",
        "age": 24,
        "photo": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
        "bio": "Product designer obsessed with typography, specialty cold brew, and indie gigs.",
        "city": "Bengaluru",
        "interests": ["Design", "Coffee", "Live Music", "Architecture"]
      }
    ],
    "meta": {
      "count": 1,
      "hasMore": false
    }
  }
  ```
- **Empty State (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [],
    "meta": {
      "count": 0,
      "hasMore": false
    },
    "message": "You've discovered everyone for now."
  }
  ```

#### 2. `POST /api/swipe`
Records a swipe decision (`like` or `pass`) and automatically evaluates reciprocal mutual matching.

- **Request Body:**
  ```json
  {
    "profileId": "6afe76ddf65904f676a4754b",
    "action": "like"
  }
  ```
- **Allowed Actions:** `"like"`, `"pass"`.
- **Validation Rules:**
  - `profileId` must be a valid 24-character hexadecimal MongoDB ObjectId.
  - `action` must be strictly `"like"` or `"pass"`.
  - Profile must exist in database (returns `404` if not found).
  - Profile must not have been previously swiped on (returns `409` if duplicate).
- **Responses (`200 OK`):**
  - **Mutual Match (Reciprocal Like):**
    ```json
    {
      "success": true,
      "message": "It's a match!",
      "data": {
        "action": "like",
        "matched": true,
        "match": {
          "profileId": "6afe76ddf65904f676a4754b",
          "name": "Aanya Sharma",
          "photo": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80"
        }
      }
    }
    ```
  - **One-sided Like (No reciprocal like):**
    ```json
    {
      "success": true,
      "message": "Like recorded successfully.",
      "data": {
        "action": "like",
        "matched": false,
        "profile": {
          "_id": "6afe76ddf65904f676a4754e",
          "name": "Arjun Verma"
        }
      }
    }
    ```
  - **Pass:**
    ```json
    {
      "success": true,
      "message": "Profile passed successfully.",
      "data": {
        "action": "pass",
        "matched": false
      }
    }
    ```

#### 3. `GET /api/matches`
Returns all confirmed mutual matches for the demo user, sorted by most recently matched.

- **Privacy Guarantee:** Only mutual likes where both users liked each other are returned. Incoming likes alone and one-sided outgoing likes are strictly excluded.
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "6afe770bf65904f676a4756f",
        "profile": {
          "_id": "6afe76ddf65904f676a4754b",
          "name": "Aanya Sharma",
          "age": 24,
          "photo": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
          "bio": "Product designer obsessed with typography, specialty cold brew, and indie gigs.",
          "city": "Bengaluru",
          "interests": ["Design", "Coffee", "Live Music", "Architecture"]
        },
        "matchedAt": "2026-11-19T04:11:55.688Z"
      }
    ],
    "meta": {
      "count": 1
    }
  }
  ```
- **Empty State (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [],
    "meta": {
      "count": 0
    },
    "message": "No matches yet. Keep discovering!"
  }
  ```

#### 4. `GET /api/health`
Basic operational check:
```json
{
  "success": true,
  "message": "Coy Discover API is running",
  "environment": "development"
}
```

---

### Mutual Matching Rules

A match is established **if and only if** both parties have submitted an active `like` action:

| Demo User Action | Mock Profile Liked Demo User? | Result | Match Record Created? |
|---|---|---|---|
| **like** | **Yes** | **MUTUAL MATCH (`matched: true`)** | **Yes** |
| **like** | No | One-sided like (`matched: false`) | No |
| **pass** | Yes | Profile passed (`matched: false`) | No |
| **pass** | No | Profile passed (`matched: false`) | No |

- An incoming like alone **never** creates a match.
- A pass **never** creates a match.
- The frontend is **never** trusted to calculate matches; all matching is computed on the server.
- The `matched: true` status is reported **only after** the `Match` document is safely committed to MongoDB.

---

### Privacy Model & Security Safeguards

1. **Incoming-Like Secrecy:**
   - Incoming likes are stored strictly as private directional Swipe records (`actorId: profileId`, `targetId: demo-user`, `action: 'like'`).
   - Profiles that liked the demo user appear in `/api/feed` with identical attributes to any other profile.
   - The fields `seedKey`, `actorId`, `targetId`, `action`, `alreadyLikedYou`, `incomingLike`, `incomingLikeCount`, `isLiked`, and `isMatched` are stripped by explicit allowlist projections.
2. **Identity Invariant:**
   - The identity `demo-user` is enforced exclusively by the backend from server configuration.
   - Any client-submitted `demoUserId`, `userId`, `actorId`, or `targetId` in headers or body is stripped by validation middleware.
3. **Duplicate Prevention:**
   - The database-level unique compound index on `(actorId, targetId)` prevents duplicate swipes. Repeat submissions immediately return `409 Conflict`.
   - The unique compound index on `(demoUserId, profileId)` guarantees that only one Match document exists per pair.

---

### Error Handling & Status Codes

All errors return a consistent JSON response:
```json
{
  "success": false,
  "message": "Human-readable error description.",
  "error": {
    "code": "ERROR_CODE"
  }
}
```

| HTTP Status | Error Code | Trigger Condition |
|---|---|---|
| `400 Bad Request` | `MISSING_PROFILE_ID` | `profileId` missing from swipe body |
| `400 Bad Request` | `INVALID_PROFILE_ID` | `profileId` is not a valid 24-character hexadecimal ObjectId |
| `400 Bad Request` | `MISSING_ACTION` | `action` missing from swipe body |
| `400 Bad Request` | `INVALID_ACTION` | `action` is not `"like"` or `"pass"` |
| `400 Bad Request` | `INVALID_JSON` | Client sent malformed JSON |
| `404 Not Found` | `PROFILE_NOT_FOUND` | `profileId` does not exist in Profile collection |
| `404 Not Found` | `NOT_FOUND` | Unmapped endpoint URL |
| `409 Conflict` | `DUPLICATE_SWIPE` | Profile already swiped on by the demo user |
| `413 Payload Too Large` | `PAYLOAD_TOO_LARGE` | Request payload exceeds 10kb limit |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | Unhandled database or runtime exception (no stack trace leaked in production) |

---

### Backend Hardening & Reliability Architecture (Phase 4)

The backend has undergone comprehensive production-readiness hardening, edge case protection, and failure recovery:

1. **High-Concurrency Protection & Race Condition Safety:**
   - Database-level compound unique index on Swipe `(actorId, targetId)` prevents duplicate directional swipes under rapid or simultaneous double-clicks.
   - When concurrent requests arrive, exactly 1 succeeds with HTTP 200, and all subsequent concurrent requests are caught via MongoDB error code `11000` and returned as HTTP 409 Conflict with zero database corruption.
   - Match creation uses atomic `findOneAndUpdate` with `upsert: true` on `(demoUserId, profileId)`, guaranteeing exactly 1 Match record even under concurrent mutual swipes.

2. **Match Failure Recovery & Self-Healing Reconciliation:**
   - If an unexpected database failure or network partition interrupts Match persistence during a reciprocal like, the swipe endpoint safely fails with HTTP 500 without falsely acknowledging a match (`matched: false`).
   - A dedicated reconciliation service (`matchReconciliationService.js`) audits reciprocal likes and idempotently heals missing Match records.
   - Self-healing reconciliation is automatically integrated into `matchService.js`, automatically restoring missing matches whenever the user accesses `/api/matches`.

3. **Deleted Profile Edge-Case Handling:**
   - Swiping on a profile deleted before the request cleanly returns `404 Not Found` (`PROFILE_NOT_FOUND`).
   - If a passed or liked profile is subsequently deleted from the database, the Discover feed remains fully functional and error-free.
   - If a profile matched with the demo user is deleted, `/api/matches` automatically filters out the orphaned record, returning only valid, active profiles.

4. **Real Database Index Architecture & Audit:**
   - **Profile:** Unique index on `seedKey` (`seedKey_1`).
   - **Swipe:** Compound unique index on `(actorId, targetId)` (`actorId_1_targetId_1`), plus single indexes on `actorId_1` and `targetId_1` for feed exclusion queries.
   - **Match:** Compound unique index on `(demoUserId, profileId)` (`demoUserId_1_profileId_1`).
   - All indexes are actively synchronized at startup and verified via automated index audit tests.

5. **Deterministic Feed Ordering:**
   - The `/api/feed` endpoint enforces deterministic ascending order on `_id` (`.sort({ _id: 1 })`).
   - Multiple sequential requests produce identical profile sequences.
   - As swipes occur, swiped profiles are excluded while the relative ordering of all remaining profiles remains 100% stable.

6. **Request Abuse & Payload Hardening:**
   - Body parser strictly limited to `10kb` (`express.json({ limit: '10kb' })`). Requests exceeding this size receive `413 Payload Too Large`.
   - Non-object JSON bodies (null, arrays, primitives) are rejected with `400 Bad Request`.
   - Unexpected fields injected into the payload (e.g. `demoUserId`, `isMatched`) are stripped by request validation middleware and cannot override backend identity.
   - Query parameter pollution is safely ignored; the demo user identity cannot be altered via query strings.

7. **Production Error Sanitization:**
   - In production (`NODE_ENV=production`), all 500 internal server errors return generic, user-safe messages (`"An unexpected internal error occurred."`).
   - Stack traces, database connection strings, file paths, and internal exceptions are never leaked in HTTP response bodies.

8. **Strict Privacy Regression Enforcement:**
   - All response payloads across `/api/feed`, `/api/swipe`, `/api/matches`, and error handlers are tested against forbidden tokens (`seedKey`, `actorId`, `targetId`, `alreadyLikedYou`, `incomingLike`, `incomingLikeCount`, `__v`).
   - Incoming likes remain 100% confidential until mutual liking occurs.

---

### Running the Application

- **Combined Development (Frontend + Backend):**
  ```powershell
  npm run dev
  ```
  Runs Vite dev server (`http://localhost:5173`) and Express backend (`http://localhost:5000`) concurrently.

- **Frontend Only:**
  ```powershell
  npm run client
  ```

- **Backend Only:**
  ```powershell
  npm run server
  ```

---

### Running Tests

Execute the complete automated test suite (19 test suites, 135 automated tests):

```powershell
# Run all test suites across all phases from root:
npm test

# Run individual test suites:
npm run test:frontend-integration --prefix server # Phase 5 Frontend Services & API Integration (7 tests)
npm run test:concurrency --prefix server          # Phase 4 Concurrency & Race Conditions (6 tests)
npm run test:recovery --prefix server             # Phase 4 Match Failure Recovery & Reconciliation (5 tests)
npm run test:deleted-profiles --prefix server     # Phase 4 Deleted Profile Edge Cases (4 tests)
npm run test:indexes --prefix server              # Phase 4 Database Index Architecture & Uniqueness (6 tests)
npm run test:feed-ordering --prefix server        # Phase 4 Feed Determinism & Order Stability (3 tests)
npm run test:hardening --prefix server            # Phase 4 Request Abuse & Input Hardening (8 tests)
npm run test:production-errors --prefix server    # Phase 4 Production Error Sanitization (6 tests)
npm run test:privacy-regression --prefix server   # Phase 4 Privacy Anti-Leak Regression (6 tests)
npm run test:persistence-hardening --prefix server # Phase 4 Server Restart Hardening (6 tests)
npm run test:feed --prefix server                 # Phase 3 Feed API tests (12 tests)
npm run test:swipe --prefix server                # Phase 3 Swipe API tests (15 tests)
npm run test:matches --prefix server              # Phase 3 Matches & Mutual Matching tests (9 tests)
npm run test:privacy --prefix server              # Phase 3 Privacy & Security audit tests (6 tests)
npm run test:integration --prefix server          # Phase 3 Full API Lifecycle & Persistence tests (6 tests)
npm run test:models --prefix server               # Phase 2 Model schema validation tests (16 tests)
npm run test:seed-data --prefix server            # Phase 2 Seed dataset integrity tests (8 tests)
npm run test:db --prefix server                   # Phase 2 Database live index & seed tests (5 tests)
npm run test:health --prefix server               # Phase 1 Backend health check test (1 test)
```

---

### Part A Product Exploration & Submission Artifacts

- **Part A Product Exploration & Feature Recommendations:** Detailed in [docs/PART_A_PRODUCT_EXPLORATION.md](file:///C:/Users/Madugu%20Shiva%20Kumar/OneDrive/图片/Desktop/coy-discover/docs/PART_A_PRODUCT_EXPLORATION.md).
- **Phase Reports:**
  - `PHASE_1_AUDIT_REPORT.md`
  - `PHASE_2_MATCH_VERIFICATION_REPORT.md`
  - `PHASE_3_DISCOVERY_REGRESSION_REPORT.md`
  - `PHASE_4_PRIVACY_AND_MATCHING_REPORT.md`
  - `PHASE_5_FINAL_TEST_REPORT.md`
  - `PHASE_7_DOCUMENTATION_REPORT.md`
  - `PHASE_8_GITHUB_READINESS_REPORT.md`
  - `FINAL_SUBMISSION_READINESS_REPORT.md`
