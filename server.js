require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── System prompt for the coaching agent ──────────────────────────────────────
const AGENT_SYSTEM_PROMPT = `You are LaunchCoach, an elite AI project coaching agent for hackathon teams.
Your role is to help teams turn raw ideas into polished demos with actionable plans.

You have 5 core capabilities:
1. **SCOPE CRITIQUE** - Analyze if the idea is too broad, too narrow, or just right for the timeframe.
2. **GAP FINDER** - Identify missing technical, business, or UX pieces in the concept.
3. **ROADMAP BUILDER** - Generate a clear milestone-based build plan with time estimates.
4. **PITCH ARCHITECT** - Create a compelling pitch outline: Problem → Solution → Demo → Impact.
5. **BLOCKER TRACKER** - Flag risks, blockers, and slipping tasks with mitigation advice.

Formatting rules:
- Always structure responses with clear headers using emoji icons.
- Use bullet points for lists.
- Be direct, practical, and encouraging.
- Tailor advice to hackathon constraints (typically 24-48 hours).
- When asked to analyze a project concept, always provide ALL 5 sections.
- For follow-up questions, respond concisely and stay in coaching mode.

Your tone: Energetic, direct, like a senior engineer + startup mentor hybrid.`;

// ── Route: Analyze project concept ───────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { concept, timeframe, teamSize, techStack } = req.body;

  if (!concept) {
    return res.status(400).json({ error: 'Project concept is required' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: AGENT_SYSTEM_PROMPT
    });

    const prompt = `
Analyze this hackathon project concept and provide a FULL coaching report.

**Project Concept:** ${concept}
**Timeframe:** ${timeframe || '24 hours'}
**Team Size:** ${teamSize || 'Unknown'}
**Tech Stack:** ${techStack || 'Not specified'}

Provide a comprehensive analysis with ALL 5 sections:
1. 🎯 Scope Critique
2. 🔍 Gap Finder (Missing Pieces)
3. 🗺️ Build Roadmap (with milestones and time estimates)
4. 🎤 Pitch Outline
5. ⚠️ Blockers & Risks

Format the roadmap as numbered milestones with time estimates.
Format blockers as a prioritized list with mitigation strategies.
Be specific and actionable. This team needs to ship in ${timeframe || '24 hours'}.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse structured sections from the response
    const sections = parseAnalysis(text);

    res.json({
      success: true,
      raw: text,
      sections,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  }
});

// ── Route: Chat with the agent ────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, history, projectContext } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: AGENT_SYSTEM_PROMPT
    });

    const chat = model.startChat({
      history: (history || []).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))
    });

    const contextPrefix = projectContext
      ? `[Project Context: ${projectContext}]\n\n`
      : '';

    const result = await chat.sendMessage(contextPrefix + message);
    const text = result.response.text();

    res.json({ success: true, response: text, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Chat failed: ' + err.message });
  }
});

// ── Route: Generate pitch deck outline ───────────────────────────────────────
app.post('/api/pitch', async (req, res) => {
  const { concept, targetAudience } = req.body;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: AGENT_SYSTEM_PROMPT
    });

    const prompt = `
Create a detailed hackathon pitch outline for:

**Concept:** ${concept}
**Target Audience:** ${targetAudience || 'Judges and investors'}

Generate a 5-slide pitch deck outline:
- Slide 1: The Problem (hook the audience)
- Slide 2: Our Solution (clear value prop)
- Slide 3: Live Demo (what to show)
- Slide 4: Impact & Traction (metrics, potential)
- Slide 5: The Ask / Next Steps

For each slide, provide: Title, 3 key bullet points, and a 30-second talking script.
    `;

    const result = await model.generateContent(prompt);
    res.json({ success: true, pitch: result.response.text() });
  } catch (err) {
    res.status(500).json({ error: 'Pitch generation failed: ' + err.message });
  }
});

// ── Route: Daily standup / blocker check ─────────────────────────────────────
app.post('/api/standup', async (req, res) => {
  const { tasks, blockers, timeRemaining, projectContext } = req.body;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: AGENT_SYSTEM_PROMPT
    });

    const prompt = `
Run a quick hackathon standup check for this team:

**Project:** ${projectContext || 'Unknown'}
**Time Remaining:** ${timeRemaining || 'Unknown'}
**Current Tasks:** ${JSON.stringify(tasks || [])}
**Reported Blockers:** ${JSON.stringify(blockers || [])}

Provide:
1. 🚦 Status Assessment (Red/Yellow/Green with reasoning)
2. 🔥 Top 3 priorities for the next sprint
3. 🧠 Quick advice to unblock each blocker
4. ⏱️ Cut scope recommendation if needed (what to drop to ship on time)

Be brutally honest but constructive. They need to ship!
    `;

    const result = await model.generateContent(prompt);
    res.json({ success: true, standup: result.response.text() });
  } catch (err) {
    res.status(500).json({ error: 'Standup failed: ' + err.message });
  }
});

// ── Helper: parse analysis into sections ─────────────────────────────────────
function parseAnalysis(text) {
  const sections = {
    scopeCritique: '',
    gapFinder: '',
    roadmap: '',
    pitch: '',
    blockers: ''
  };

  const patterns = [
    { key: 'scopeCritique', regex: /🎯[^\n]*scope[^\n]*/i },
    { key: 'gapFinder', regex: /🔍[^\n]*gap[^\n]*/i },
    { key: 'roadmap', regex: /🗺️[^\n]*roadmap[^\n]*/i },
    { key: 'pitch', regex: /🎤[^\n]*pitch[^\n]*/i },
    { key: 'blockers', regex: /⚠️[^\n]*block[^\n]*/i }
  ];

  const lines = text.split('\n');
  let currentSection = null;
  let buffer = [];

  for (const line of lines) {
    let matched = false;
    for (const p of patterns) {
      if (p.regex.test(line)) {
        if (currentSection) sections[currentSection] = buffer.join('\n').trim();
        currentSection = p.key;
        buffer = [line];
        matched = true;
        break;
      }
    }
    if (!matched && currentSection) buffer.push(line);
  }
  if (currentSection) sections[currentSection] = buffer.join('\n').trim();

  return sections;
}

// ── Serve the frontend ────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 LaunchCoach Agent running at http://localhost:${PORT}`);
  console.log(`   API Key configured: ${process.env.GEMINI_API_KEY ? '✅' : '❌ Missing!'}\n`);
});
