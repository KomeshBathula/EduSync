# EduSync AI — Intelligent Adaptive Learning Platform

EduSync AI is a full-stack web application designed for colleges and universities. It uses AI to generate quizzes, detect student weaknesses, predict academic risk, and provide personalized learning paths — all within a modern, role-based dashboard.

---

## ✨ Features

### 🎓 Student
- Personalized dashboard with quiz accuracy progression chart
- AI-powered Risk Meter (LOW / MEDIUM / HIGH)
- Adaptive quiz attempts with anti-cheat shuffling and countdown timer
- Automatic weakness detection after each quiz
- Access to teacher-uploaded class notes
- AI tools: YouTube AI Summarizer, Doubt Solver, Smart Revision Generator *(in progress)*

### 👨‍🏫 Teacher (Command Center)
- Class analytics with Radar chart for topic mastery
- High-risk student identification
- **Groq AI Quiz Generator** — generate MCQs from a topic or uploaded PDF/DOC
- Upload class notes (PDFs, images) to specific sections
- Manage quizzes and materials

### 🛡️ Admin
- Academic Hierarchy management (Year / Branch / Section)
- Full User Directory — create, edit, delete Students & Faculty
- Assign students to class sections

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Framer Motion, Recharts |
| Backend | Node.js, Express.js, Socket.IO |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcryptjs |
| AI Engine | Groq API (llama-3.3-70b-versatile) |
| Deployment | Vercel (frontend) + Render (backend) |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or Atlas URI)
- Groq API Key → [console.groq.com](https://console.groq.com)
- yt-dlp (`pip3 install yt-dlp`) — for YouTube AI Summarizer

### Installation

```bash
# Clone the repository
git clone https://github.com/RAMTEJA87/EduSync.git
cd EduSync

# Install all dependencies
npm run install:all

# OR manually:
cd server && npm install
cd ../client && npm install
```

### Environment Setup

Create `server/.env` (see `server/.env.example`):

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/edusync-ai
JWT_SECRET=your_secret_key_here
GROQ_API_KEY=your_groq_api_key_here
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

Create `client/.env` (see `client/.env.example`):

```env
VITE_API_URL=http://localhost:5000
```

> **Note:** In local dev, the Vite proxy forwards `/api` requests to port 5000, so `VITE_API_URL` can be left empty. For production, it must be set to your backend URL.

### Seed Sample Data

```bash
cd server && node seed.js
```

This creates 100 students, 10 teachers, 5 quizzes, and ~200 quiz results. Default password: `Password@123`

### Running the App

```bash
# Terminal 1 — Start backend
cd server && npm run dev

# Terminal 2 — Start frontend
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🌐 Deployment

### 🚀 Recommended: Vercel (Frontend) + Render (Backend)

This is the **optimal deployment strategy** for EduSync:

**Quick Deploy**:
1. **Backend (Render)**:
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repo → Select `main` branch
   - Root Directory: `server`
   - Build: `npm install` | Start: `npm start`
   - Add environment variables (see guide below)

2. **Frontend (Vercel)**:
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Import your GitHub repo
   - Root Directory: `client`
   - Framework: Vite (auto-detected)
   - Add `VITE_API_URL` environment variable (your Render backend URL)

**📖 See the deployment sections below for complete step-by-step guides.**

---

### Manual Deployment Options

<details>
<summary><strong>Backend → Render (Manual Setup)</strong></summary>

1. Go to [render.com](https://render.com) and create a new **Web Service**
2. Connect the GitHub repo
3. Set **Root Directory** to `server`
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. Add environment variables (see `server/.env.example`):
   - `MONGO_URI` = your MongoDB Atlas connection string
   - `JWT_SECRET` = strong random string (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `GROQ_API_KEY` = your Groq API key
   - `NODE_ENV` = `production`
   - `ALLOWED_ORIGINS` = your Vercel frontend URL (e.g. `https://edusync.vercel.app`)
   - `STRICT_EXAM_MODE` = `true` (for zero-tolerance exam security)
7. Deploy!

</details>

<details>
<summary><strong>Frontend → Vercel (Manual Setup)</strong></summary>

1. Go to [vercel.com](https://vercel.com) and import the GitHub repo
2. Set **Root Directory** to `client`
3. Vercel auto-detects Vite — build command: `npm run build`, output: `dist`
4. Add environment variable:
   - `VITE_API_URL` = your deployed Render backend URL (e.g. `https://edusync-backend.onrender.com`)
5. Deploy!

</details>

<details>
<summary><strong>Alternative: Backend → Railway</strong></summary>

1. Go to [railway.app](https://railway.app) and create a new project from GitHub
2. Set **Root Directory** to `server`
3. Add the same environment variables as Render
4. Railway auto-detects Node.js and deploys

</details>

<details>
<summary><strong>Backend → Docker (Self-hosted)</strong></summary>

```bash
cd server
docker build -t edusync-api .
docker run -p 5000:5000 --env-file .env edusync-api
```

</details>

<details>
<summary><strong>Database → MongoDB Atlas (Free Tier)</strong></summary>

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user with password
3. Whitelist **all IPs** (`0.0.0.0/0`) for Render/Railway access
4. Copy the connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/edusync-ai?retryWrites=true&w=majority
   ```
5. Set it as `MONGO_URI` in your deployment environment variables

</details>

---

### Environment Variables Reference

**Backend Required**:
- `MONGO_URI` — MongoDB connection string (Atlas recommended)
- `JWT_SECRET` — Secret key for JWT tokens (32+ random characters)
- `GROQ_API_KEY` — Get from [console.groq.com/keys](https://console.groq.com/keys)
- `ALLOWED_ORIGINS` — Frontend URL for CORS (e.g., `https://edusync-frontend.onrender.com`)

**Backend Optional**:
- `PORT` — Server port (default: 5000, Render sets this automatically)
- `NODE_ENV` — Environment mode (development/production)
- `ENABLE_ML` — Enable ML risk prediction (default: true)
- `STRICT_EXAM_MODE` — Exam security mode (true = single violation terminates quiz, false = 3-violation threshold)

**Frontend Required**:
- `VITE_API_URL` — Backend API URL (e.g., `https://edusync-backend.onrender.com`)

---

## 📁 Project Structure

```
EduSync/
├── package.json             # Root monorepo scripts
├── render.yaml              # Render deployment blueprint
├── README.md
│
├── client/                  # React + Vite frontend (deploy to Vercel)
│   ├── vercel.json          # Vercel SPA config
│   ├── .env.example         # Frontend env template
│   └── src/
│       ├── api/             # Axios instance with auth interceptors
│       ├── pages/
│       │   ├── auth/        # Login pages (Student, Teacher, Admin)
│       │   ├── student/     # Dashboard, Quiz, AI Tools
│       │   ├── teacher/     # Command Center, Quiz Generator
│       │   └── admin/       # System Administration
│       ├── components/      # Shared UI components
│       ├── contexts/        # Theme context
│       └── styles/          # CSS theme variables
│
└── server/                  # Express backend (deploy to Render/Railway)
    ├── Dockerfile           # Docker deployment
    ├── Procfile             # Heroku/Render Procfile
    ├── .env.example         # Backend env template
    ├── config/              # MongoDB connection
    ├── controllers/         # Route handlers
    ├── middleware/           # JWT auth, rate limiter
    ├── models/              # Mongoose schemas
    ├── routes/              # API route definitions
    ├── services/
    │   ├── ai/              # Groq quiz gen, risk engine, doubt solver, etc.
    │   └── core/            # Learning path & resource recommendation
    └── utils/               # JWT helper
```

---

## 🤖 AI Services

| Service | Description |
|---|---|
| `groqQuizService` | Calls Groq LLM to generate N MCQs from topic/PDF context |
| `weakAreaDetector` | Updates student's weak topics after quiz submission |
| `predictionEngine` | Calculates risk level from quiz trends + weakness density |
| `assignmentEvaluator` | Converts raw score to weighted marks |
| `learningPathGenerator` | Generates personalized study paths |
| `resourceRecommendationService` | Recommends class materials per student |

---

## 📌 Current Status

All features are fully functional:
- ✅ Role-based auth (Student, Teacher, Admin)
- ✅ AI Quiz Generator (Groq LLM, topic or PDF-based)
- ✅ **Ultra Strict Exam Lockdown Mode** — Zero-tolerance exam security (single violation = immediate termination)
- ✅ Risk Prediction Engine & Weakness Detection
- ✅ YouTube AI Summarizer (yt-dlp + Groq)
- ✅ AI Doubt Solver
- ✅ Smart Revision Generator
- ✅ Teacher Command Center with analytics
- ✅ Admin Panel with academic structure management
- ✅ File uploads stored in MongoDB (not filesystem)
- ✅ Production-ready with Render deployment configs (render.yaml)
- ✅ Comprehensive test coverage (Jest)

---

## 📄 License

MIT
