# Coy Discover

### Project description

A standalone swipe-based profile discovery and mutual matching application built as part of the Coy SDE Intern assignment.

### Current implementation status

**Phase 1 — Project initialization and environment setup (Complete).**

### Technology stack

- **Frontend:** React.js, Vite, JavaScript, CSS (Mobile-first responsive design)
- **Backend:** Node.js, Express.js, ES Modules
- **Development Tooling:** npm, concurrently, nodemon, Git

### Project structure

```text
coy-discover/
│
├── client/                     # Frontend React (Vite) application
│   ├── public/                 # Static public assets
│   ├── src/
│   │   ├── assets/             # Images, icons, static resources
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # View/Page components
│   │   ├── services/           # API services & client requests
│   │   ├── hooks/              # Custom React hooks
│   │   ├── styles/             # Modular style sheets
│   │   ├── App.jsx             # Main application component & layout
│   │   ├── App.css             # Application-level styling
│   │   ├── index.css           # Global CSS variables and resets
│   │   └── main.jsx            # Application mount point
│   ├── index.html              # HTML5 entry page
│   ├── vite.config.js          # Vite configuration with /api backend proxy
│   └── package.json            # Frontend dependencies and scripts
│
├── server/                     # Backend Node.js / Express application
│   ├── config/                 # Environment & configuration modules
│   ├── controllers/            # Route controllers & request handlers
│   ├── middleware/             # Express middlewares (CORS, error handling)
│   ├── models/                 # Database schema models (Phase 2)
│   ├── routes/                 # API route definitions
│   ├── seed/                   # Database seed scripts (Phase 2)
│   ├── tests/                  # Integration & unit test suites
│   ├── app.js                  # Express app initialization & middleware
│   ├── server.js               # HTTP server listener & port binding
│   └── package.json            # Backend dependencies and scripts
│
├── .env.example                # Example environment variables template
├── .gitignore                  # Git ignore rules for node_modules, logs, env
├── package.json                # Root package for coordinated development
└── README.md                   # Project documentation
```

### Prerequisites

- **Node.js** (v18.0.0 or higher recommended, verified with v24+)
- **npm** (v9.0.0 or higher, verified with v11+)
- **Git**

### Installation

1. Clone or open the repository root:
   ```bash
   cd coy-discover
   ```

2. Install root orchestration dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   npm install --prefix client
   ```

4. Install backend dependencies:
   ```bash
   npm install --prefix server
   ```

### Environment setup

Copy the example environment configuration into `.env`:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Bash
cp .env.example .env
```

Default variables:
```env
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

# Add the database configuration in Phase 2.
# MONGODB_URI=mongodb://localhost:27017/coy-discover
```

### Running the application

- **Combined Development (Frontend + Backend):**
  ```bash
  npm run dev
  ```
  Runs both Vite development server (port `5173`) and Express backend (port `5000`) concurrently.

- **Frontend Only:**
  ```bash
  npm run client
  ```
  Runs Vite dev server at `http://localhost:5173`.

- **Backend Only:**
  ```bash
  npm run server
  ```
  Runs Express API server with nodemon at `http://localhost:5000`.

### API health check

The Express backend exposes a basic health endpoint:

```http
GET /api/health
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Coy Discover API is running",
  "environment": "development"
}
```

When running the frontend via Vite, requests to `/api/health` are seamlessly proxied to the backend.

### Future implementation

Subsequent development phases will introduce:
- **Phase 2:** MongoDB Setup, Database Architecture, Data Models, and Mock Profile Seeding (30+ profiles).
- **Phase 3:** Discover Feed API (`GET /feed`), Swipe API (`POST /swipe`), and Matches API (`GET /matches`).
- **Phase 4:** Interactive Swipe Card UI with Framer Motion gestures (swipe right to like, swipe left to pass, desktop action buttons).
- **Phase 5:** Mutual Matching Logic, "It's a Match!" celebration modal, and Matches view.
- **Phase 6:** Privacy enforcement (never expose incoming likes unless mutual), comprehensive automated testing (Jest/Supertest), and production readiness.
