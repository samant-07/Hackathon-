// State
let currentProjectConcept = '';
let currentAnalysis = null;
let chatHistory = [];
let timerInterval = null;
let secondsElapsed = 0;

// API Helper
async function apiCall(endpoint, data) {
  try {
    const res = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'API Error');
    return result;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

// ── Navigation ──
function switchTab(tabId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  document.getElementById(`page-${tabId}`).classList.add('active');
  document.getElementById(`nav-${tabId}`).classList.add('active');
  
  const titles = {
    'analyze': 'Analyze Your Concept',
    'roadmap': 'Build Roadmap',
    'pitch': 'Pitch Builder',
    'standup': 'Blocker Check-In',
    'chat': 'Coach Chat'
  };
  document.getElementById('page-title').innerText = titles[tabId];

  // Clear badges
  if(tabId === 'roadmap') document.getElementById('roadmap-badge').classList.add('hidden');
  if(tabId === 'chat') document.getElementById('chat-badge').classList.remove('pulse');

  if(window.innerWidth <= 768) toggleSidebar();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── Timer ──
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  secondsElapsed = 0;
  timerInterval = setInterval(() => {
    secondsElapsed++;
    const h = String(Math.floor(secondsElapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
    const s = String(secondsElapsed % 60).padStart(2, '0');
    document.getElementById('timer-text').innerText = `${h}:${m}:${s}`;
  }, 1000);
}

// ── Toast ──
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Markdown Parser (Basic) ──
function parseMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
    .replace(/\n/g, '<br/>');
  
  // Fix nested lists
  html = html.replace(/<\/ul><br\/><ul>/g, '');
  html = html.replace(/<\/ol><br\/><ol>/g, '');
  return html;
}

// ── Feature: Analyze ──
async function analyzeProject() {
  const concept = document.getElementById('concept-input').value;
  const timeframe = document.getElementById('timeframe-input').value;
  const teamSize = document.getElementById('teamsize-input').value;
  const techStack = document.getElementById('techstack-input').value;

  if (!concept.trim()) {
    showToast('Please enter a project concept', 'error');
    return;
  }

  const btn = document.getElementById('analyze-btn');
  const loader = document.getElementById('analyze-loader');
  
  btn.disabled = true;
  loader.classList.remove('hidden');

  try {
    const data = await apiCall('analyze', { concept, timeframe, teamSize, techStack });
    
    currentProjectConcept = concept;
    currentAnalysis = data.sections;
    
    // Update Sidebar
    document.getElementById('sidebar-project-name').innerText = concept.substring(0, 30) + '...';
    document.getElementById('sidebar-project-meta').innerText = timeframe;
    
    // Fill Results
    renderAnalysisResults(data.sections);
    
    // Populate Pitch tab
    document.getElementById('pitch-concept').value = concept;
    
    // Notify Roadmap
    document.getElementById('roadmap-badge').classList.remove('hidden');
    buildVisualRoadmap(data.sections.roadmap);

    showToast('Analysis complete! Check Roadmap and Pitch tabs.');
    if (!timerInterval) startTimer();
    
  } catch (err) {
    console.error(err);
  } finally {
    btn.disabled = false;
    loader.classList.add('hidden');
  }
}

function renderAnalysisResults(sections) {
  document.getElementById('empty-state').classList.add('hidden');
  const container = document.getElementById('analysis-results');
  container.classList.remove('hidden');
  
  container.innerHTML = `
    <div class="result-card">
      <div class="result-header">🎯 Scope Critique</div>
      <div class="result-body">${parseMarkdown(sections.scopeCritique)}</div>
    </div>
    <div class="result-card">
      <div class="result-header">🔍 Gap Finder</div>
      <div class="result-body">${parseMarkdown(sections.gapFinder)}</div>
    </div>
    <div class="result-card">
      <div class="result-header">⚠️ Initial Risks</div>
      <div class="result-body">${parseMarkdown(sections.blockers)}</div>
    </div>
  `;
}

// ── Feature: Roadmap ──
function buildVisualRoadmap(roadmapText) {
  const container = document.getElementById('roadmap-container');
  if(!roadmapText) return;

  // Simple parser: assumes list items with numbers or bold text are milestones
  const lines = roadmapText.split('\n').filter(l => l.trim().length > 0);
  
  let html = '<div class="timeline">';
  let currentMilestone = '';
  
  lines.forEach((line, index) => {
    // If line looks like a header/milestone (starts with number, -, or **)
    if (/^(\d+\.|-|\*\*)/.test(line.trim())) {
      let timeMatch = line.match(/\(?(Hour \d+|Day \d+|\d+ hours?)\)?/i);
      let timeStr = timeMatch ? timeMatch[0].replace(/[()]/g, '') : `Phase ${index + 1}`;
      let title = line.replace(/^\d+\. |- |\*\*/g, '').replace(/\*\*/g, '').trim();
      
      html += `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-time">${timeStr}</div>
            <div class="timeline-title">${title}</div>
          </div>
        </div>
      `;
    }
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// ── Feature: Pitch ──
async function generatePitch() {
  const concept = document.getElementById('pitch-concept').value;
  const audience = document.getElementById('pitch-audience').value;
  const output = document.getElementById('pitch-output');

  if (!concept) return showToast('Concept required', 'error');

  output.innerHTML = '<div class="empty-state"><h3>Generating Pitch... 🎤</h3><p>Consulting the AI architect...</p></div>';

  try {
    const data = await apiCall('pitch', { concept, targetAudience: audience });
    output.innerHTML = `<div class="result-body">${parseMarkdown(data.pitch)}</div>`;
  } catch (err) {
    output.innerHTML = '<div class="empty-state"><h3>Failed to generate pitch</h3></div>';
  }
}

// ── Feature: Standup ──
function addTask() {
  const list = document.getElementById('task-list');
  const el = document.createElement('div');
  el.className = 'task-item';
  el.innerHTML = `
    <select class="task-status">
      <option value="todo">🔵 To Do</option><option value="doing">🟡 In Progress</option>
      <option value="done">🟢 Done</option><option value="blocked">🔴 Blocked</option>
    </select>
    <input class="task-input" type="text" placeholder="New task..." />
    <button class="task-delete" onclick="deleteTask(this)">×</button>
  `;
  list.appendChild(el);
}

function addBlocker() {
  const list = document.getElementById('blocker-list');
  const el = document.createElement('div');
  el.className = 'blocker-item';
  el.innerHTML = `
    <span class="blocker-badge">🔴 Risk</span>
    <input class="task-input" type="text" placeholder="Describe risk..." />
    <button class="task-delete" onclick="deleteTask(this)">×</button>
  `;
  list.appendChild(el);
}

function deleteTask(btn) {
  btn.parentElement.remove();
}

async function runStandup() {
  const tasks = Array.from(document.querySelectorAll('#task-list .task-item')).map(el => ({
    status: el.querySelector('select').value,
    desc: el.querySelector('input').value
  })).filter(t => t.desc.trim() !== '');

  const blockers = Array.from(document.querySelectorAll('#blocker-list .blocker-item')).map(el => 
    el.querySelector('input').value
  ).filter(b => b.trim() !== '');

  const timeRemaining = document.getElementById('time-remaining').value;
  const resultDiv = document.getElementById('standup-result');

  resultDiv.classList.remove('hidden');
  resultDiv.innerHTML = 'Analyzing standup data... ⏳';

  try {
    const data = await apiCall('standup', { tasks, blockers, timeRemaining, projectContext: currentProjectConcept });
    resultDiv.innerHTML = `<div class="card-header"><span class="card-icon">⚡</span><h2 class="card-title">Coach's Verdict</h2></div><div class="result-body">${parseMarkdown(data.standup)}</div>`;
  } catch (err) {
    resultDiv.innerHTML = 'Error running standup.';
  }
}

// ── Feature: Chat ──
function appendMessage(role, text) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `message ${role}-message`;
  
  const avatar = role === 'agent' ? '🤖' : '🧑‍💻';
  
  div.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-bubble">${parseMarkdown(text)}</div>
  `;
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sendQuickPrompt(btn) {
  document.getElementById('chat-input').value = btn.innerText;
  sendMessage();
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function clearChat() {
  chatHistory = [];
  document.getElementById('chat-messages').innerHTML = `
    <div class="message agent-message">
      <div class="message-avatar">🤖</div>
      <div class="message-bubble"><p>Chat cleared. How can I help you now?</p></div>
    </div>
  `;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  appendMessage('user', message);
  input.value = '';
  
  const typingId = 'typing-' + Date.now();
  const container = document.getElementById('chat-messages');
  container.insertAdjacentHTML('beforeend', `
    <div class="message agent-message" id="${typingId}">
      <div class="message-avatar">🤖</div>
      <div class="message-bubble"><p><em>Thinking...</em></p></div>
    </div>
  `);
  container.scrollTop = container.scrollHeight;

  try {
    const data = await apiCall('chat', {
      message,
      history: chatHistory,
      projectContext: currentProjectConcept
    });
    
    document.getElementById(typingId).remove();
    appendMessage('agent', data.response);
    
    chatHistory.push({ role: 'user', content: message });
    chatHistory.push({ role: 'model', content: data.response });
    
  } catch (err) {
    document.getElementById(typingId).remove();
    appendMessage('agent', '**Error:** Could not connect to AI coach.');
  }
}
