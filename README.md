# 🚀 LaunchCoach — AI Hackathon Project Coach

An AI-powered coaching agent that turns raw project ideas into structured build plans, pitch outlines, and demo roadmaps. Built for hackathon teams who want to ship fast.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **Scope Critique** | Analyzes if your idea is too broad, too narrow, or perfectly scoped |
| 🔍 **Gap Finder** | Identifies missing technical, UX, and business pieces |
| 🗺️ **Roadmap Builder** | Generates a visual, milestone-based plan with time estimates |
| 🎤 **Pitch Builder** | Crafts a 5-slide pitch outline with demo scripts |
| ⚠️ **Blocker Tracker** | Live standup check to surface risks and unblock your team |
| 💬 **Coach Chat** | Always-on AI mentor for any question throughout the hackathon |

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, Google Gemini AI API
- **Frontend:** Vanilla HTML, CSS (Glassmorphism + Earthy Aesthetic), JavaScript
- **Fonts:** Playfair Display, Outfit (Google Fonts)

---

## ⚡ Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/launchcoach.git
cd launchcoach
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```
Open `.env` and add your **Google Gemini API key**:
```
GEMINI_API_KEY=your_key_here
```
Get a free key at: https://aistudio.google.com/apikey

### 4. Start the server
```bash
npm start
```

### 5. Open in browser
```
http://localhost:3000
```

---

## 📂 Project Structure

```
launchcoach/
├── server.js          # Express backend + Gemini AI routes
├── public/
│   ├── index.html     # Main app UI
│   ├── styles.css     # Earthy aesthetic design system
│   ├── app.js         # Frontend logic
│   └── pitch.html     # Standalone pitch deck (open in browser)
├── .env.example       # Environment variables template
└── package.json
```

---

## 🎤 Pitch Deck

A beautiful, standalone hackathon pitch deck is included at:
```
http://localhost:3000/pitch.html
```
Navigate with `←` `→` arrow keys or click the arrows.

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/analyze` | Full 5-part project coaching report |
| POST | `/api/pitch` | Generate 5-slide pitch outline |
| POST | `/api/standup` | Run a blocker check-in standup |
| POST | `/api/chat` | Chat with the AI coach |

---

Built with ❤️ at Hackathon 2026
