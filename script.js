let chatHistory = [];
let currentEmbedTab = 'full';

/* =========================
   NAV / UI
========================= */

function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');

  const tabs = document.querySelectorAll('.nav-tab');
  const map = { tools: 0, followup: 1, listing: 2, booking: 3, embed: 4 };

  if (map[name] !== undefined && tabs[map[name]]) {
    tabs[map[name]].classList.add('active');
  }
}

/* =========================
   CHAT
========================= */

function appendMsg(text, cls) {
  const container = document.getElementById('chat-messages');
  if (!container) return null;

  const el = document.createElement('div');
  el.className = 'msg ' + cls;
  el.innerText = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  if (!input) return;

  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  appendMsg(msg, 'user');

  const typingEl = appendMsg('Alex is typing...', 'bot typing');

  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });

    const data = await response.json();
    if (typingEl) typingEl.remove();

    if (!response.ok) {
      appendMsg(data.error || 'Server error', 'bot');
      return;
    }

    appendMsg(data.reply, 'bot');

  } catch (err) {
    if (typingEl) typingEl.remove();
    appendMsg('Request failed: ' + err.message, 'bot');
  }
}

/* =========================
   LISTING GENERATOR
========================= */

async function generateListing() {
  const btn = document.getElementById('listing-btn');
  btn.disabled = true;
  btn.innerText = "Generating...";

  const data = {
    address: document.getElementById('prop-address')?.value || '',
    beds: document.getElementById('prop-beds')?.value || '',
    sqft: document.getElementById('prop-sqft')?.value || '',
    price: document.getElementById('prop-price')?.value || '',
    year: document.getElementById('prop-year')?.value || '',
    features: document.getElementById('prop-features')?.value || '',
    tone: document.getElementById('prop-tone')?.value || ''
  };

  const prompt = `
Create a MLS real estate listing:

Address: ${data.address}
Beds/Baths: ${data.beds}
Sqft: ${data.sqft}
Price: ${data.price}
Year built: ${data.year}
Features: ${data.features}
Tone: ${data.tone}

Make it professional, emotional, and high-converting.
`;

  const resultBox = document.getElementById('listing-result');
  const content = document.getElementById('listing-content');

  try {
    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        type: "listing"
      })
    });

    const json = await res.json();

    if (!res.ok) {
      content.innerText = json.error || "Error generating listing";
      resultBox.classList.add('visible');
      return;
    }

    content.innerText = json.reply;
    resultBox.classList.add('visible');

    document.getElementById('copy-listing-btn').style.display = 'block';

  } catch (err) {
    content.innerText = err.message;
    resultBox.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.innerText = "Generate MLS listing";
  }
}

/* =========================
   FOLLOW-UP GENERATOR + SAVE LEAD
========================= */

async function generateFollowUp() {
  const btn = document.getElementById('followup-btn');
  btn.disabled = true;
  btn.innerText = "Generating...";

  const data = {
    name: document.getElementById('lead-name')?.value || '',
    contact: document.getElementById('lead-contact')?.value || '',
    source: document.getElementById('lead-source')?.value || '',
    type: document.getElementById('lead-type')?.value || '',
    notes: document.getElementById('lead-notes')?.value || ''
  };

  const prompt = `
Create follow-up messages for a real estate lead:

Name: ${data.name}
Contact: ${data.contact}
Source: ${data.source}
Intent: ${data.type}
Notes: ${data.notes}

Return:
1 email version
1 SMS version (short, under 160 chars)
`;

  const emailBox = document.getElementById('email-content');
  const smsBox = document.getElementById('sms-content');

  document.getElementById('email-result')?.classList.add('visible');
  document.getElementById('sms-result')?.classList.add('visible');

  try {
    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        type: "followup"
      })
    });

    const json = await res.json();

    if (!res.ok) {
      emailBox.innerText = json.error || "Error generating follow-up";
      smsBox.innerText = "";
      return;
    }

    const parts = json.reply.split("SMS");

    emailBox.innerText = parts[0] || json.reply;
    smsBox.innerText = parts[1] || "SMS not separated clearly";

    // ✅ SAVE LEAD TO DASHBOARD
    saveLead({
      name: data.name || "Unknown",
      contact: data.contact || "N/A",
      status: Math.random() > 0.5 ? "Hot" : "Follow-up",
      date: new Date().toISOString()
    });

  } catch (err) {
    emailBox.innerText = err.message;
  } finally {
    btn.disabled = false;
    btn.innerText = "Generate follow-up messages";
  }
}

/* =========================
   LEAD DASHBOARD SYSTEM
========================= */

let leads = JSON.parse(localStorage.getItem('propai_leads') || '[]');

function saveLead(lead) {
  leads.push(lead);
  localStorage.setItem('propai_leads', JSON.stringify(leads));
  renderLeads();
  updateStats();
}

function renderLeads() {
  const container = document.getElementById('leads-list');
  if (!container) return;

  if (leads.length === 0) {
    container.innerHTML = "No leads yet";
    return;
  }

  container.innerHTML = '';

  leads.slice().reverse().forEach(l => {
    const el = document.createElement('div');
    el.style.padding = '10px';
    el.style.border = '1px solid #EEE';
    el.style.borderRadius = '8px';

    el.innerHTML = `
      <strong>${l.name}</strong> — ${l.contact}<br>
      <span style="font-size:12px;color:#888;">
        ${l.status} • ${new Date(l.date).toLocaleDateString()}
      </span>
    `;

    container.appendChild(el);
  });
}

function updateStats() {
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);

  const total = leads.length;
  const hot = leads.filter(l => l.status === 'Hot').length;
  const followup = leads.filter(l => l.status === 'Follow-up').length;
  const week = leads.filter(l => new Date(l.date) > weekAgo).length;

  document.getElementById('stat-total').innerText = total;
  document.getElementById('stat-hot').innerText = hot;
  document.getElementById('stat-followup').innerText = followup;
  document.getElementById('stat-week').innerText = week;
}

function setDashboardDate() {
  const el = document.getElementById('dashboard-date');
  if (!el) return;

  const today = new Date();
  el.innerText = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

/* =========================
   COPY
========================= */

function copyListing() {
  const text = document.getElementById('listing-content')?.innerText || '';
  navigator.clipboard.writeText(text);

  const el = document.getElementById('copy-success');
  el?.classList.add('visible');

  setTimeout(() => el?.classList.remove('visible'), 2500);
}

/* =========================
   EMBED
========================= */

function switchEmbedTab(btn, tab) {
  document.querySelectorAll('.embed-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentEmbedTab = tab;
  updateEmbedCode();
}

function updateEmbedCode() {
  const agency = document.getElementById('agency-name')?.value || 'Your Agency';
  const color = document.getElementById('primary-color')?.value || '#C9A84C';
  const tools = document.getElementById('embed-tools')?.value || 'all';
  const label = document.getElementById('bubble-label')?.value || 'Book a Showing'; // ✅ FIXED
  const pos = document.getElementById('bubble-pos')?.value || 'bottom-right';

  let code = '';

  if (currentEmbedTab === 'full') {
    code = `<iframe src="https://propai.app/widget?agency=${agency}&color=${color}&tools=${tools}" width="100%" height="720"></iframe>`;
  } 
  else if (currentEmbedTab === 'chat') {
    code = `<script>
window.PropAIConfig = {
  agencyName: "${agency}",
  primaryColor: "${color}",
  buttonLabel: "${label}",
  position: "${pos}"
};
<\/script>
<script src="https://propai.app/embed.js" async><\/script>`;
  } 
  else {
    code = `WordPress shortcode version here`;
  }

  const block = document.getElementById('embed-code-block');
  if (block) block.innerText = code;
}

function copyEmbedCode() {
  const text = document.getElementById('embed-code-block')?.innerText || '';
  navigator.clipboard.writeText(text);
}

/* INIT */
document.addEventListener('DOMContentLoaded', () => {
  updateEmbedCode();
  renderLeads();
  updateStats();
  setDashboardDate();
});
