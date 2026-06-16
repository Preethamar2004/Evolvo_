# Evolvo — Level Up Your Real Life 🚀

> A full-stack gamified personal growth platform built with **React + FastAPI**.

---

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS v4         |
| State     | Zustand, TanStack Query                 |
| Forms     | React Hook Form + Zod                   |
| HTTP      | Axios (with JWT interceptors)           |
| Backend   | FastAPI, Python 3.11+                   |
| ORM       | SQLAlchemy 2.0 + Alembic                |
| Auth      | JWT (jose) + bcrypt (passlib)           |
| Database  | PostgreSQL 15+                          |

---

## Folder Structure

```
Evolvo/
├── frontend/                   # React + Vite app
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   └── layout/
│   │   │       └── Sidebar.jsx
│   │   ├── lib/
│   │   │   └── api.js           # Axios instance
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   └── ForgotPasswordPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   └── LandingPage.jsx
│   │   ├── services/
│   │   │   └── apiServices.js   # API function calls
│   │   ├── store/
│   │   │   └── authStore.js     # Zustand auth store
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css            # Design system
│   ├── index.html
│   └── vite.config.js
│
└── backend/                    # FastAPI app
    ├── app/
    │   ├── routers/
    │   │   ├── auth.py          # Auth endpoints
    │   │   ├── profile.py       # Profile endpoints
    │   │   └── dashboard.py     # Dashboard endpoints
    │   ├── config.py            # Pydantic settings
    │   ├── database.py          # SQLAlchemy engine
    │   ├── models.py            # ORM models
    │   ├── schemas.py           # Pydantic schemas
    │   ├── security.py          # JWT + password hashing
    │   └── services.py          # Business logic
    ├── migrations/
    │   └── env.py               # Alembic config
    ├── main.py                  # FastAPI entry point
    ├── alembic.ini
    └── requirements.txt
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+

### 1. Database Setup
```sql
CREATE DATABASE evolvo_db;
```

### 2. Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and set your DATABASE_URL and SECRET_KEY

# Run migrations (or auto-create in dev mode)
alembic upgrade head

# Start dev server
uvicorn main:app --reload --port 8000
```

API Docs: http://localhost:8000/api/docs

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## API Reference

### Authentication
| Method | Endpoint                       | Auth | Description             |
|--------|-------------------------------|------|-------------------------|
| POST   | /api/v1/auth/register          | —    | Register new user        |
| POST   | /api/v1/auth/login             | —    | Login, get JWT tokens    |
| POST   | /api/v1/auth/logout            | ✓    | Logout (client-side)     |
| POST   | /api/v1/auth/refresh           | —    | Refresh access token     |
| POST   | /api/v1/auth/forgot-password   | —    | Send reset email         |
| POST   | /api/v1/auth/reset-password    | —    | Reset with token         |
| POST   | /api/v1/auth/change-password   | ✓    | Change current password  |
| GET    | /api/v1/auth/me                | ✓    | Get current user         |

### Profile
| Method | Endpoint                 | Auth | Description             |
|--------|--------------------------|------|-------------------------|
| GET    | /api/v1/profile/         | ✓    | Get own profile          |
| PUT    | /api/v1/profile/         | ✓    | Update profile           |
| POST   | /api/v1/profile/avatar   | ✓    | Upload avatar image      |
| GET    | /api/v1/profile/{username}| —   | Get public profile       |

### Dashboard
| Method | Endpoint              | Auth | Description             |
|--------|-----------------------|------|-------------------------|
| GET    | /api/v1/dashboard/    | ✓    | Full dashboard data      |

---

## Database Schema

```
users              → id, email, username, hashed_password, role, is_active
user_profiles      → user_id, full_name, bio, age, country, avatar_url, skills[], interests[], hobbies[], goals[]
user_gamification  → user_id, xp, level, total_xp_earned, streak_days
missions           → id, title, description, xp_reward, difficulty, category
user_missions      → user_id, mission_id, status, progress (0.0-1.0)
achievements       → id, title, description, xp_reward, rarity
user_achievements  → user_id, achievement_id, earned_at
```

### XP / Level Formula
```
XP needed for level N = 100 × N^1.5
Level 1 → 100 XP
Level 5 → 559 XP
Level 10 → 1,000 XP
Level 50 → 17,678 XP
```

---

## Environment Variables

### Backend (.env)
```env
SECRET_KEY=your-super-secret-min-32-chars
DATABASE_URL=postgresql://postgres:password@localhost:5432/evolvo_db
FRONTEND_URL=http://localhost:5173
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### Frontend (.env)
```env
VITE_API_URL=/api/v1
```

---

## Features Roadmap

- [x] User Authentication (Register / Login / JWT)
- [x] Protected Routes
- [x] User Profile with Tags
- [x] Avatar Upload
- [x] Dashboard with XP/Level/Missions
- [x] Forgot / Reset Password
- [ ] Missions CRUD
- [ ] Achievements Engine
- [ ] Leaderboard
- [ ] Social Features
- [ ] Notifications
- [ ] Mobile App (React Native)
