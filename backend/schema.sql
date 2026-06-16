-- ================================================================
-- Evolvo Database Schema — Full DDL
-- PostgreSQL 15+
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ─────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE mission_status AS ENUM ('active', 'completed', 'failed', 'paused');

-- ── Users ─────────────────────────────────────────────────────────

CREATE TABLE users (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                  VARCHAR(255) UNIQUE NOT NULL,
    username               VARCHAR(50)  UNIQUE NOT NULL,
    hashed_password        VARCHAR(255) NOT NULL,
    role                   user_role    NOT NULL DEFAULT 'user',
    is_active              BOOLEAN      NOT NULL DEFAULT TRUE,
    is_verified            BOOLEAN      NOT NULL DEFAULT FALSE,
    onboarding_complete    BOOLEAN      NOT NULL DEFAULT FALSE,
    password_reset_token   VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login             TIMESTAMPTZ
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- ── User Profiles ─────────────────────────────────────────────────

CREATE TABLE user_profiles (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name    VARCHAR(150),
    bio          TEXT,
    age          INTEGER CHECK (age >= 13 AND age <= 120),
    country      VARCHAR(100),
    avatar_url   VARCHAR(500),
    banner_url   VARCHAR(500),
    skills       TEXT[]   NOT NULL DEFAULT '{}',
    interests    TEXT[]   NOT NULL DEFAULT '{}',
    hobbies      TEXT[]   NOT NULL DEFAULT '{}',
    goals        TEXT[]   NOT NULL DEFAULT '{}',
    social_links JSONB    NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── User Gamification ─────────────────────────────────────────────

CREATE TABLE user_gamification (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    xp                 INTEGER NOT NULL DEFAULT 0,
    level              INTEGER NOT NULL DEFAULT 1,
    total_xp_earned    INTEGER NOT NULL DEFAULT 0,
    streak_days        INTEGER NOT NULL DEFAULT 0,
    last_activity_date TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Missions ──────────────────────────────────────────────────────

CREATE TABLE missions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    xp_reward   INTEGER NOT NULL DEFAULT 0,
    difficulty  VARCHAR(50),
    category    VARCHAR(100),
    icon        VARCHAR(100),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_missions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mission_id   UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    status       mission_status NOT NULL DEFAULT 'active',
    progress     FLOAT NOT NULL DEFAULT 0.0 CHECK (progress >= 0 AND progress <= 1),
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ── Achievements ──────────────────────────────────────────────────

CREATE TABLE achievements (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(200) NOT NULL,
    description TEXT,
    icon        VARCHAR(100),
    xp_reward   INTEGER NOT NULL DEFAULT 0,
    rarity      VARCHAR(50) NOT NULL DEFAULT 'common',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_achievements (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Onboarding Responses ──────────────────────────────────────────

CREATE TABLE onboarding_responses (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hobbies          TEXT[] NOT NULL DEFAULT '{}',
    interests        TEXT[] NOT NULL DEFAULT '{}',
    sports           TEXT[] NOT NULL DEFAULT '{}',
    movies           TEXT[] NOT NULL DEFAULT '{}',
    games            TEXT[] NOT NULL DEFAULT '{}',
    skills_to_learn  TEXT[] NOT NULL DEFAULT '{}',
    career_goals     TEXT[] NOT NULL DEFAULT '{}',
    personal_goals   TEXT[] NOT NULL DEFAULT '{}',
    strengths        TEXT[] NOT NULL DEFAULT '{}',
    areas_to_improve TEXT[] NOT NULL DEFAULT '{}',
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Personality Profiles ──────────────────────────────────────────

CREATE TABLE personality_profiles (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id               UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Personality Type
    personality_type      VARCHAR(100),
    personality_emoji     VARCHAR(10),
    personality_summary   TEXT,

    -- Six Scores (0-100)
    knowledge_score       INTEGER NOT NULL DEFAULT 0 CHECK (knowledge_score BETWEEN 0 AND 100),
    fitness_score         INTEGER NOT NULL DEFAULT 0 CHECK (fitness_score BETWEEN 0 AND 100),
    creativity_score      INTEGER NOT NULL DEFAULT 0 CHECK (creativity_score BETWEEN 0 AND 100),
    leadership_score      INTEGER NOT NULL DEFAULT 0 CHECK (leadership_score BETWEEN 0 AND 100),
    communication_score   INTEGER NOT NULL DEFAULT 0 CHECK (communication_score BETWEEN 0 AND 100),
    social_score          INTEGER NOT NULL DEFAULT 0 CHECK (social_score BETWEEN 0 AND 100),

    -- AI Insights
    identified_strengths      TEXT[] NOT NULL DEFAULT '{}',
    identified_weaknesses     TEXT[] NOT NULL DEFAULT '{}',
    growth_opportunities      TEXT[] NOT NULL DEFAULT '{}',
    motivation_style          VARCHAR(200),
    motivation_description    TEXT,

    -- Recommendations
    recommended_missions      TEXT[] NOT NULL DEFAULT '{}',
    recommended_skills        TEXT[] NOT NULL DEFAULT '{}',
    archetype_tags            TEXT[] NOT NULL DEFAULT '{}',

    -- Raw AI response
    raw_ai_response           JSONB NOT NULL DEFAULT '{}',

    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
