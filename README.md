# EduSync

EduSync is an adaptive learning and assessment platform for academic institutions. It combines role-based management dashboards with automated quiz generation, student performance analytics, weakness tracking, and personalized revision planning.

---

## Key Features

### Student Portal
- **Performance Dashboard**: Real-time accuracy tracking and topic mastery visualizations.
- **Risk Analytics**: Instant academic risk classification (Low, Medium, High) based on recent quiz scores and weakness density.
- **Adaptive Assessments**: Timed quizzes with question shuffling and server-enforced submission deadlines.
- **Automated Weakness Detection**: Identifies target learning areas immediately following quiz completion.
- **Study Planner & Doubt Assistant**: 7-day revision schedule generation and interactive Q&A support.
- **Course Materials**: Access to faculty-uploaded study resources.

### Faculty / Teacher Portal
- **Class Analytics**: Topic mastery breakdown using radar charts and class performance distributions.
- **AI Quiz Generator**: Creates multiple-choice assessments from topic prompts or uploaded course materials (PDFs, documents).
- **Draft & Edit Workflow**: Question review, editing, and publishing controls prior to releasing quizzes to students.
- **Resource Management**: Upload section-specific course notes and study guides.

### Administrative Control
- **Academic Hierarchy**: Configure academic years, branches, and sections.
- **User Directory**: Manage student and faculty accounts and section assignments.

### Assessment Security
- **Server-Side Time Enforcement**: Rejects late submissions regardless of client clock tampering.
- **Attempt Locking**: Restricts modifications to draft quizzes once an active attempt has begun.
- **Duplicate Guarding**: Compound database indexes prevent multiple active submissions.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Recharts |
| **Backend** | Node.js, Express.js, Socket.IO |
| **Database** | MongoDB, Mongoose |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs |
| **AI Integration** | Groq API (`llama-3.3-70b-versatile`) |

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local instance or MongoDB Atlas connection string
- **Groq API Key**: Obtainable from [console.groq.com](https://console.groq.com)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RAMTEJA87/EduSync.git
   cd EduSync
   ```

2. **Install dependencies:**
   ```bash
   # Install root and workspace dependencies
   npm run install:all

   # Or manually:
   cd server && npm install
   cd ../client && npm install
   ```

### Environment Configuration

1. Create `server/.env` using `server/.env.example` as a template:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/edusync-ai
   JWT_SECRET=your_jwt_secret_here
   GROQ_API_KEY=your_groq_api_key_here
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   ```

2. Create `client/.env` using `client/.env.example` as a template:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

### Database Seeding

Populate the database with initial academic structures and test accounts:

```bash
cd server && node seed.js
```

**Available Test Accounts:**

- **Faculty / Teacher:**
  - Email: `teacher@edusync.com`
  - Password: `teacher@123`

- **Student:**
  - Email: `student@edusync.com`
  - Password: `student@123`

### Running the Application

Start the backend and frontend development servers in separate terminals:

```bash
# Terminal 1: Backend Server (Port 5000)
cd server && npm run dev

# Terminal 2: Frontend Client (Port 5173)
cd client && npm run dev
```

Access the application at `http://localhost:5173`.

---

## Project Structure

```
EduSync/
├── client/                  # Frontend application (React + Vite)
│   ├── src/
│   │   ├── api/             # Axios configuration and interceptors
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React context providers
│   │   ├── pages/           # Route views (Auth, Student, Teacher, Admin)
│   │   └── styles/          # Global styles and theme tokens
│   └── package.json
│
└── server/                  # Backend application (Node.js + Express)
    ├── config/              # Database connection setup
    ├── controllers/         # API route logic handlers
    ├── middleware/          # Auth, validation, and error middleware
    ├── models/              # Mongoose schemas
    ├── routes/              # Express API route endpoints
    ├── services/            # Core business logic and AI integration
    ├── utils/               # Helper utilities
    ├── seed.js              # Database seed script
    └── package.json
```

---

## Core Services

| Service | Description |
|---|---|
| `groqQuizService` | Interacts with Groq LLM to generate multiple-choice questions. |
| `doubtSolverService` | Handles contextual student Q&A interactions. |
| `smartRevisionService` | Generates structured weekly revision schedules based on weakness areas. |
| `weakAreaDetector` | Analyzes quiz responses to update student weakness profiles. |
| `predictionEngine` | Calculates student risk tiers based on test trends and weakness density. |

---

## License

This project is licensed under the [MIT License](LICENSE).
