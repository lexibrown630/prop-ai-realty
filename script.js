let chatHistory = [];
let currentEmbedTab = 'full';

/* ---------------------------
   SAFE ELEMENT HELPER
---------------------------- */
function getEl(id) {
  return document.getElementById(id);
}

/* ---------------------------
   PANEL NAV
---------------------------- */
function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  const panel = getEl('panel-' + name);
  if (panel) panel.classList.add('active');

  const tabs = document.querySelectorAll('.nav-tab');
  const map = { tools: 0, followup: 1, listing: 2, booking: 3, embed: 4 };

  if (map[name] !== undefined && tabs[map[name]]) {
    tabs[map[name]].classList.add('active');
  }
}

/* ---------------------------
   CHAT UI
---------------------------- */
function appendMsg(text, cls) {
  const container = getEl('chat-messages');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'msg ' + cls;
  el.innerText = text;

  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

/* ---------------------------
   MAIN CHAT
---------------------------- */
async function sendChat() {
  const input = getEl('chat-input');
  if (!input) return;

  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  appendMsg(msg, 'user');

  const typing = appendMsg('Alex is typing...', 'bot typing');

  try {
    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msg,
        type: "chat"
      })
    });

    const data = await res.json();

    if (typing) typing.remove?.();

    if (!res.ok) {
      appendMsg('Error: ' + (data.error || 'Request failed'), 'bot');
      return;
    }

    appendMsg(data.reply, 'bot');

  } catch (err) {
    if (typing) typing.remove?.();
    appendMsg('Request failed: ' + err.message, 'bot');
  }
}

/* ---------------------------
   🏡 LISTING GENERATOR (SAFE)
---------------------------- */
async function generateListing() {
  console.log("LISTING CLICKED");

  const output = getEl('listing-content');
  if (output) output.innerText = "Generating listing...";

  try {
    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Modern 3 bed 2 bath home with pool and upgrades",
        type: "listing"
      })
    });

    const data = await res.json();

    if (!res.ok) {
      if (output) output.innerText = "Error generating listing.";
      return;
    }

    if (output) output.innerText = data.reply;
    console.log("LISTING RESULT:", data.reply);

  } catch (err) {
    if (output) output.innerText = "Request failed: " + err.message;
  }
}

/* ---------------------------
   📩 FOLLOW-UP GENERATOR (SAFE)
---------------------------- */
async function generateFollowUp() {
  console.log("FOLLOWUP CLICKED");

  const output = getEl('followup-output');
  if (output) output.innerText = "Generating follow-up...";

  try {
    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Lead viewed property but did not respond",
        type: "followup"
      })
    });

    const data = await res.json();

    if (!res.ok) {
      if (output) output.innerText = "Error generating follow-up.";
      return;
    }

    if (output) output.innerText = data.reply;
    console.log("FOLLOWUP RESULT:", data.reply);

  } catch (err) {
    if (output) output.innerText = "Request failed: " + err.message;
  }
}

/* ---------------------------
   BOOKING (UNCHANGED)
---------------------------- */
function selectSlot(btn, slotLabel) {
  document.querySelectorAll('.slot-btn:not(.taken)').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  appendMsg('I want to book the ' + slotLabel + ' slot.', 'user');
  getEl('booking-confirm')?.classList.add('visible');
}

/* ---------------------------
   COPY LISTING
---------------------------- */
function copyListing() {
  const text = getEl('listing-content')?.innerText || '';
  navigator.clipboard.writeText(text);

  const el = getEl('copy-success');
  if (el) {
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 2500);
  }
}

/* ---------------------------
   EMBED (UNCHANGED)
---------------------------- */
function switchEmbedTab(btn, tab) {
  document.querySelectorAll('.embed-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentEmbedTab = tab;
  updateEmbedCode();
}

function updateEmbedCode() {
  const agency = getEl('agency-name')?.value || 'Your Agency';
  const color = getEl('primary-color')?.value || '#C9A84C';
  const tools = getEl('embed-tools')?.value || 'all';
  const label = getEl('bubble-label')?.value || 'Book a Showing';
  const pos = getEl('bubble-pos')?.value || 'bottom-right';

  let code = '';

  if (currentEmbedTab === 'full') {
    code = `<!-- PropAI Widget -->
<iframe src="https://propai.app/widget?agency=${encodeURIComponent(agency)}&color=${encodeURIComponent(color)}&tools=${tools}"
width="100%" height="720" frameborder="0"></iframe>`;
  } else {
    code = `<!-- Embed Script -->
<script>
window.PropAIConfig = {
agencyName: "${agency}",
primaryColor: "${color}",
buttonLabel: "${label}",
position: "${pos}"
};
<\/script>
<script src="https://propai.app/embed.js" async><\/script>`;
  }

  const block = getEl('embed-code-block');
  if (block) block.innerText = code;
}

function copyEmbedCode() {
  const text = getEl('embed-code-block')?.innerText || '';
  navigator.clipboard.writeText(text);
}

/* ---------------------------
   INIT
---------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  updateEmbedCode();
});
