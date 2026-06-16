import json
import re
from typing import Optional
from groq import Groq
from app.config import settings


def _build_prompt(answers: dict) -> str:
    """Build a structured prompt for Groq from onboarding answers."""
    return f"""You are an expert personality analyst and life coach AI. Analyze the following person's onboarding questionnaire answers and generate a comprehensive, insightful personality profile.

## User Answers:

1. **Hobbies:** {", ".join(answers.get("hobbies", [])) or "Not specified"}
2. **Interests:** {", ".join(answers.get("interests", [])) or "Not specified"}
3. **Sports they enjoy:** {", ".join(answers.get("sports", [])) or "Not specified"}
4. **Movies they enjoy:** {", ".join(answers.get("movies", [])) or "Not specified"}
5. **Games they enjoy:** {", ".join(answers.get("games", [])) or "Not specified"}
6. **Skills they want to learn:** {", ".join(answers.get("skills_to_learn", [])) or "Not specified"}
7. **Career they want:** {", ".join(answers.get("career_goals", [])) or "Not specified"}
8. **Personal goals:** {", ".join(answers.get("personal_goals", [])) or "Not specified"}
9. **Their strengths:** {", ".join(answers.get("strengths", [])) or "Not specified"}
10. **Areas to improve:** {", ".join(answers.get("areas_to_improve", [])) or "Not specified"}

## Your Task:
Analyze these answers deeply and return a JSON object with the following structure (respond with ONLY valid JSON, no markdown, no extra text):

{{
  "personality_type": "A creative title like 'The Visionary Creator' or 'The Strategic Leader'",
  "personality_emoji": "A single emoji that represents this personality (e.g. 🚀)",
  "personality_summary": "A compelling 2-3 sentence overview of this person's personality, written directly to them in second person.",
  "scores": {{
    "knowledge_score": <integer 0-100, based on intellectual curiosity, learning goals, career ambition>,
    "fitness_score": <integer 0-100, based on sports, physical activities, health goals>,
    "creativity_score": <integer 0-100, based on creative hobbies, arts, games, interests>,
    "leadership_score": <integer 0-100, based on career goals, strengths, personal goals>,
    "communication_score": <integer 0-100, based on social interests, career choices, communication-related goals>,
    "social_score": <integer 0-100, based on team sports, multiplayer games, social hobbies, social goals>
  }},
  "identified_strengths": ["strength1", "strength2", "strength3", "strength4"],
  "identified_weaknesses": ["weakness1", "weakness2", "weakness3"],
  "growth_opportunities": ["opportunity1", "opportunity2", "opportunity3", "opportunity4"],
  "motivation_style": "A short label like 'Achievement-Driven', 'Purpose-Led', 'Curiosity-Fueled', etc.",
  "motivation_description": "2-3 sentences explaining how this person is motivated and what drives them.",
  "recommended_missions": ["Specific actionable mission 1", "mission 2", "mission 3", "mission 4", "mission 5"],
  "recommended_skills": ["skill1", "skill2", "skill3", "skill4"],
  "archetype_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}}

Be insightful, specific to their actual answers, encouraging, and realistic. Make the personality type feel unique and aspirational.
"""


def analyze_personality(answers: dict) -> dict:
    """
    Call Groq API to analyze onboarding answers and return structured personality data.
    Returns a dict matching PersonalityProfile fields.
    """
    if not settings.GROQ_API_KEY:
        return _mock_analysis(answers)

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        prompt = _build_prompt(answers)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2048,
            top_p=0.9
        )

        raw_text = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

        data = json.loads(raw_text)
        return _parse_ai_response(data, raw_text)

    except Exception as e:
        print(f"[AI Service] Groq error: {e}. Using mock analysis.")
        return _mock_analysis(answers)


def _parse_ai_response(data: dict, raw_text: str) -> dict:
    """Parse and validate API response into PersonalityProfile fields."""
    scores = data.get("scores", {})
    return {
        "personality_type":      data.get("personality_type", "The Evolving Soul"),
        "personality_emoji":     data.get("personality_emoji", "⚡"),
        "personality_summary":   data.get("personality_summary", ""),
        "knowledge_score":       max(0, min(100, int(scores.get("knowledge_score", 50)))),
        "fitness_score":         max(0, min(100, int(scores.get("fitness_score", 50)))),
        "creativity_score":      max(0, min(100, int(scores.get("creativity_score", 50)))),
        "leadership_score":      max(0, min(100, int(scores.get("leadership_score", 50)))),
        "communication_score":   max(0, min(100, int(scores.get("communication_score", 50)))),
        "social_score":          max(0, min(100, int(scores.get("social_score", 50)))),
        "identified_strengths":  data.get("identified_strengths", [])[:6],
        "identified_weaknesses": data.get("identified_weaknesses", [])[:5],
        "growth_opportunities":  data.get("growth_opportunities", [])[:5],
        "motivation_style":      data.get("motivation_style", "Growth-Oriented"),
        "motivation_description":data.get("motivation_description", ""),
        "recommended_missions":  data.get("recommended_missions", [])[:5],
        "recommended_skills":    data.get("recommended_skills", [])[:6],
        "archetype_tags":        data.get("archetype_tags", [])[:6],
        "raw_ai_response":       data,
    }


def _mock_analysis(answers: dict) -> dict:
    """Generate a deterministic mock personality profile when no API key is set."""
    has_sports = bool(answers.get("sports"))
    has_games  = bool(answers.get("games"))
    has_creative = any(k in str(answers.get("hobbies", [])).lower() for k in ["art", "music", "draw", "write", "create"])

    return {
        "personality_type": "The Ambitious Trailblazer",
        "personality_emoji": "🚀",
        "personality_summary": (
            "You are a driven individual with a natural curiosity about the world and an eagerness to grow. "
            "Your diverse interests suggest a multifaceted personality that thrives on challenge and exploration. "
            "You have the potential to forge your own unique path by combining your passions with your ambitions."
        ),
        "knowledge_score":    72,
        "fitness_score":      55 if has_sports else 30,
        "creativity_score":   68 if has_creative else 50,
        "leadership_score":   63,
        "communication_score":58,
        "social_score":       65 if has_games else 45,
        "identified_strengths": [
            "Self-awareness and desire for growth",
            "Clear vision for your future",
            "Willingness to explore new areas",
            "Goal-oriented mindset",
        ],
        "identified_weaknesses": [
            "May spread focus across too many interests",
            "Could benefit from more structured routines",
            "Tendency to underestimate progress made",
        ],
        "growth_opportunities": [
            "Build daily learning habits to compound knowledge",
            "Connect with communities aligned with your goals",
            "Start one creative project to develop your skills",
            "Set measurable weekly milestones for your career",
        ],
        "motivation_style": "Achievement-Driven",
        "motivation_description": (
            "You are fueled by tangible results and progress. Seeing clear markers of advancement keeps you energized. "
            "You perform best when you can track your growth and celebrate milestones along the way."
        ),
        "recommended_missions": [
            "Complete a 30-day skill-building challenge",
            "Read 5 books related to your career path",
            "Join an online community in your interest area",
            "Build a personal portfolio or project",
            "Establish a consistent daily routine for 21 days",
        ],
        "recommended_skills": [
            "Time Management", "Public Speaking", "Critical Thinking", "Networking",
        ],
        "archetype_tags": ["Achiever", "Explorer", "Learner", "Builder", "Visionary"],
        "raw_ai_response": {"mock": True, "answers_received": list(answers.keys())},
    }


def generate_mentor_response(chat_history: list, user_profile_context: Optional[dict] = None) -> str:
    """
    Call Groq API to generate a mentor response based on the conversation history
    and user personality profile context.
    """
    if not settings.GROQ_API_KEY:
        return _mock_mentor_response(chat_history)

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        # Compile context about the user
        context_str = ""
        if user_profile_context:
            context_str = f"""
## User Profile & Onboarding Context:
- **Personality Type:** {user_profile_context.get("personality_type", "The Evolver")}
- **Summary:** {user_profile_context.get("personality_summary", "A determined individual on a journey of personal growth.")}
- **Goals:** {", ".join(user_profile_context.get("goals", [])) or "Growth"}
- **Interests/Hobbies:** {", ".join(user_profile_context.get("interests", [])) or "Learning"}
- **Strengths:** {", ".join(user_profile_context.get("strengths", [])) or "Desire to improve"}
- **Skills they want to learn:** {", ".join(user_profile_context.get("skills_to_learn", [])) or "Self-improvement"}
"""

        # System Instructions
        system_instruction = f"""You are Evolvo, an elite AI Mentor, Coach, Friend, and Guide.

Your personality:
- **Friend:** Empathetic, casual yet respectful, active listener.
- **Mentor:** Wise, experienced, guides with thought-provoking questions.
- **Coach:** Encouraging, helps them stay accountable but without being overwhelming.

Guidelines:
1. Act like a natural, conversational chatbot. Directly answer the user's questions in a helpful and engaging way.
2. DO NOT force rigid templates. DO NOT automatically generate "Action Plans", "Missions", or massive curriculums unless the user specifically asks for them.
3. Keep your responses concise, focused, and conversational. Ask follow-up questions to keep the dialogue flowing naturally.
4. Tailor your language to the user's profile context if provided below.
{context_str}
"""

        messages = [{"role": "system", "content": system_instruction}]
        
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.75,
            max_tokens=1500,
            top_p=0.9
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"[AI Service] Groq chat error: {e}. Using mock response.")
        return _mock_mentor_response(chat_history)


def _mock_mentor_response(chat_history: list) -> str:
    """Fallback generator for local testing without an API key."""
    if not chat_history:
        return "Hey there! I'm Evolvo, your personal AI Mentor. What's on your mind today? We can talk about career goals, building a startup, upgrading your skills, or even movies and sports!"

    last_user_message = ""
    for msg in reversed(chat_history):
        if msg["role"] == "user":
            last_user_message = msg["content"].lower()
            break

    # Contextual mock response
    if "cricket" in last_user_message:
        return "### 🏏 Improving Your Cricket Game: Action Plan\n\nThat's awesome! Cricket requires a blend of technique, physical fitness, and mental focus. Here's a starter action plan:\n\n1. **Master the Basics (Technique)**: Spend 15 minutes daily doing shadow batting (practicing your drive, defense) in front of a mirror, or practicing your bowling release.\n2. **Fitness Drill**: Core strength and agility are key. Incorporate 3 sets of shuttle runs (10 meters and back) and planks (1-minute hold) into your week.\n3. **Mental Focus**: Spend 5 minutes visualising playing a perfect innings or bowling a perfect line and length before your practice session.\n\n**Recommended Mission:** \n* *Net Session Checkpoint*: Spend 30 minutes in the nets this week focusing *only* on leaving balls outside off-stump (for batters) or maintaining line and length (for bowlers). Write down 2 things you did well and 1 to improve.\n\nHow does that sound? What specific area of cricket are you looking to polish? (Batting, bowling, fielding, or captaincy?)"
    elif "movie" in last_user_message or "film" in last_user_message:
        return "### 🎬 Movie Recommendations for Inspiration & Growth\n\nHere are a few hand-picked movies that align with the spirit of **Evolvo**—overcoming odds, scaling new heights, and mastering a craft:\n\n1. **Moneyball (2011)**: Perfect for understanding strategy, analytics, and challenging traditional systems (great for sports & startup minds!).\n2. **The Pursuit of Happyness (2006)**: An incredible motivator about resilience, perseverance, and dedication in the face of absolute hardship.\n3. **Whiplash (2014)**: A intense look at the dedication, drive, and cost of attempting to achieve absolute greatness in a skill.\n4. **Good Will Hunting (1997)**: A beautiful tale about mentorship, confronting your inner roadblocks, and realizing your potential.\n\nWhich one of these sounds like the vibe you are looking for tonight, or do you want something more lighthearted?"
    elif "engineer" in last_user_message or "ai engineer" in last_user_message:
        return "### 🚀 Your Roadmap to Becoming an AI Engineer\n\nBecoming an AI Engineer is an exciting journey! The field is fast-paced, but with a structured roadmap, you can make steady, compounding progress. Here is your action plan:\n\n#### Phase 1: Foundation (Weeks 1-4)\n* **Python Mastery**: Learn variables, loops, OOP, and data structures.\n* **Math Refresher**: Focus on basic linear algebra (matrices), probability, and calculus.\n\n#### Phase 2: Data & Libraries (Weeks 5-8)\n* Learn data manipulation libraries: **NumPy**, **Pandas**, and visualization using **Matplotlib/Seaborn**.\n* Build simple scripts to scrape or analyze a dataset you care about.\n\n#### Phase 3: Machine Learning (Weeks 9-14)\n* Learn algorithms (regression, classification, clustering) using **Scikit-Learn**.\n* Master the theory behind training, validation, overfitting, and evaluation metrics.\n\n#### Phase 4: Deep Learning & AI (Weeks 15+)\n* Deep dive into Neural Networks using **TensorFlow** or **PyTorch**.\n* Learn to build with LLMs, prompt engineering, and RAG frameworks (like LangChain).\n\n**Recommended Mission:**\n* *Hello World ML*: Write a Python script using Scikit-Learn to train a simple Linear Regression model on a house pricing dataset. \n\nWhat is your current level of programming experience? Let's tailor the first step to you!"
    elif "demotivat" in last_user_message or "sad" in last_user_message or "feel down" in last_user_message:
        return "### ❤️ You're Doing Better Than You Think\n\nI hear you, and it's completely normal to feel demotivated or overwhelmed. Growth isn't a straight line; it has dips, stagnation, and breakthroughs.\n\nHere is a quick **Reset Protocol** to get you through today:\n1. **Lower the Bar**: Do not worry about doing a massive project today. Just aim to do *one tiny thing* for 5 minutes.\n2. **Change Your Environment**: Go for a 10-minute walk outside without your phone. Feel the air, clear your head.\n3. **Write It Down**: Journal what is draining your energy. Sometimes, seeing it on paper shrinks its power over you.\n\nRemember: **You don't need motivation to start; you need to start to get motivation.** Action breeds energy.\n\nWhat is one tiny task you can do right now to build momentum? Even if it's just drinking a glass of water or organizing your desk, tell me and let's tick it off together!"
    elif "startup" in last_user_message or "business" in last_user_message or "idea" in last_user_message:
        return "### 💡 Premium Startup Concept: Micro-SaaS for Niche Creators\n\nHere is a startup concept designed around modern market trends:\n\n**Concept:** *CollabSync* — A micro-platform that matches local physical businesses (cafes, gyms, bookstores) with micro-influencers (1k-10k followers) for automated, low-cost marketing campaigns.\n* **The Problem**: Local cafes want social media exposure but can't afford PR agencies or large influencers. Micro-influencers want free meals/perks and local partnerships but lack the time/process to pitch.\n* **The Solution**: Businesses list free vouchers/rewards on the app (e.g. \"Free brunch for a Reel\"). Influencers apply, post, submit their link, and the app verifies the post and handles reward distribution.\n* **Monetization**: Charge businesses a flat monthly subscription ($29/mo) to list up to 5 campaigns.\n\n#### Next Action Steps (To validate this):\n1. **Talk to 5 local business owners**: Ask if they would give away a free item in exchange for a local Instagram/TikTok post.\n2. **Talk to 5 micro-influencers**: Ask if they would use a simple directory to get free local rewards in exchange for content.\n\nWould you like to brainstorm another idea, or do you want to run a SWOT analysis on this one?"
    else:
        return "I'm right here with you! As your mentor, I'm here to help you navigate whatever you're working on. \n\nWhether you want to build a step-by-step career path, brainstorm business ideas, debug a problem, or just talk through some lifestyle habits, I've got your back.\n\nWhat project or goal are we focusing on today?"


# ─── Phase 7 & 8 Additions ───────────────────────────────────────────────────

def recommend_entertainment_activities(user_profile: dict) -> dict:
    """Recommend movies, games, sports, and quests based on user profile."""
    if not settings.GROQ_API_KEY:
        return _mock_entertainment_recommendations(user_profile)

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        prompt = f"""Based on this user's profile:
Interests: {user_profile.get('interests', [])}
Hobbies: {user_profile.get('hobbies', [])}

Suggest 2 movies, 2 games, 2 sports goals, and 2 fun quests.
Return ONLY valid JSON:
{{
  "movies": [{{"title": "...", "reason": "..."}}],
  "games": [{{"title": "...", "reason": "..."}}],
  "sports": [{{"title": "...", "reason": "..."}}],
  "quests": [{{"title": "...", "reason": "..."}}]
}}"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        raw_text = response.choices[0].message.content.strip()
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)
        return json.loads(raw_text)
    except Exception as e:
        print(f"[AI Service] Entertainment rec error: {e}")
        return _mock_entertainment_recommendations(user_profile)


def _mock_entertainment_recommendations(user_profile: dict) -> dict:
    return {
        "movies": [
            {"title": "The Matrix", "reason": "Because you like tech and philosophy."},
            {"title": "Moneyball", "reason": "Combines sports with analytics."}
        ],
        "games": [
            {"title": "Chess", "reason": "Great for strategic thinking."},
            {"title": "Elden Ring", "reason": "Builds resilience and patience."}
        ],
        "sports": [
            {"title": "Run 5K", "reason": "Builds cardiovascular endurance."},
            {"title": "100 Pushups", "reason": "Core strength challenge."}
        ],
        "quests": [
            {"title": "Talk to a stranger", "reason": "Boosts social confidence."},
            {"title": "Cook a new recipe", "reason": "Sparks creativity."}
        ]
    }


def generate_future_selves(user_profile: dict, gamification: dict) -> list:
    """Generate 5 future self simulations based on current stats."""
    if not settings.GROQ_API_KEY:
        return _mock_future_selves(user_profile)

    try:
        client = Groq(api_key=settings.GROQ_API_KEY)

        prompt = f"""Generate 5 diverse 'Future Self' career/life simulations for this user:
Interests: {user_profile.get('interests', [])}
Skills: {user_profile.get('skills', [])}
Current Level: {gamification.get('level', 1)}

Output ONLY valid JSON representing a list of 5 objects, where each object has:
- title: string (e.g. "Future AI Engineer")
- probability: integer 0-100
- timeline: list of 3 strings (1 year, 3 years, 5 years milestones)
- predicted_achievements: list of 3 strings
- missing_skills: list of 3 strings
- improvement_suggestions: list of 3 strings
"""
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
        )
        
        raw_text = response.choices[0].message.content.strip()
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)
        return json.loads(raw_text)
    except Exception as e:
        print(f"[AI Service] Future self error: {e}")
        return _mock_future_selves(user_profile)


def _mock_future_selves(user_profile: dict) -> list:
    return [
        {
            "title": "Future Tech Entrepreneur",
            "probability": 75,
            "timeline": ["Launch MVP", "Reach 10k MRR", "Acquisition offer"],
            "predicted_achievements": ["Built a successful SaaS", "Featured in TechCrunch", "Created 10 jobs"],
            "missing_skills": ["Sales", "Team Management", "Financial modeling"],
            "improvement_suggestions": ["Read 'The Lean Startup'", "Practice cold email pitching", "Learn basic accounting"]
        },
        {
            "title": "Future AI Engineer",
            "probability": 82,
            "timeline": ["Master PyTorch", "Deploy LLM app", "Lead AI team"],
            "predicted_achievements": ["Open source contributor", "Patent holder", "AI Conference speaker"],
            "missing_skills": ["Advanced Calculus", "MLOps", "Distributed Systems"],
            "improvement_suggestions": ["Take Andrew Ng's courses", "Build a RAG pipeline", "Study system design"]
        },
        {
            "title": "Future Content Creator",
            "probability": 60,
            "timeline": ["Reach 1k subs", "Monetize channel", "Full-time creator"],
            "predicted_achievements": ["Silver Play Button", "Brand deals", "Loyal community"],
            "missing_skills": ["Video Editing", "Storytelling", "SEO"],
            "improvement_suggestions": ["Post 1 video a week", "Learn Premiere Pro", "Analyze top creators"]
        },
        {
            "title": "Future Pro Athlete",
            "probability": 40,
            "timeline": ["Join local league", "Win regional tournament", "Go pro"],
            "predicted_achievements": ["League MVP", "Sponsorship deal", "Championship ring"],
            "missing_skills": ["Dietary discipline", "Advanced agility", "Mental toughness"],
            "improvement_suggestions": ["Hire a coach", "Track macros", "Meditate daily"]
        },
        {
            "title": "Future Researcher",
            "probability": 65,
            "timeline": ["Publish paper", "Get PhD", "Lead research lab"],
            "predicted_achievements": ["Groundbreaking discovery", "Tenure", "Published book"],
            "missing_skills": ["Academic writing", "Data analysis", "Patience"],
            "improvement_suggestions": ["Read research papers weekly", "Learn R/Python stats", "Connect with professors"]
        }
    ]
