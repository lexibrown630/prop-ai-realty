let currentEmbedTab = 'full';

/* =========================
   NAV / UI (FIXED)
========================= */

function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');

  // UPDATED (removed booking index)
  const tabs = document.querySelectorAll('.nav-tab');
  const map = { tools: 0, followup: 1, listing: 2, embed: 3 };

  if (map[name] !== undefined && tabs[map[name]]) {
    tabs[map[name]].classList.add('active');
  }
}

/* =========================
   LISTING GENERATOR (IMPROVED)
========================= */

async function generateListing() {
  const btn = document.getElementById('listing-btn');
  if (!btn) return;

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
      body: JSON.stringify({ message: prompt, type: "listing" })
    });

    const json = await res.json();

    if (!res.ok || !json.reply) {
      throw new Error(json.error || "Failed to generate listing");
    }

    content.innerText = json.reply;
    resultBox.classList.add('visible');

    document.getElementById('copy-listing-btn')?.style.display = 'block';

  } catch (err) {
    content.innerText = "Error: " + err.message;
    resultBox.classList.add('visible');
  } finally {
    btn.disabled = false;
    btn.innerText = "Generate MLS listing";
  }
}

/* =========================
   FOLLOW-UP GENERATOR (IMPROVED)
========================= */

async function generateFollowUp() {
  const btn = document.getElementById('followup-btn');
  if (!btn) return;

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

Return clearly separated:

EMAIL:
...

SMS:
...
`;

  const emailBox = document.getElementById('email-content');
  const smsBox = document.getElementById('sms-content');

  document.getElementById('email-result')?.classList.add('visible');
  document.getElementById('sms-result')?.classList.add('visible');

  try {
    const res = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, type: "followup" })
    });

    const json = await res.json();

    if (!res.ok || !json.reply) {
      throw new Error(json.error || "Failed to generate follow-up");
    }

    // BETTER parsing
    const emailMatch = json.reply.split("SMS:")[0];
    const smsMatch = json.reply.split("SMS:")[1];

    emailBox.innerText = emailMatch?.replace("EMAIL:", "").trim() || json.reply;
    smsBox.innerText = smsMatch?.trim() || "SMS not generated clearly";

  } catch (err) {
    emailBox.innerText = "Error: " + err.message;
    smsBox.innerText = "";
  } finally {
    btn.disabled = false;
    btn.innerText = "Generate follow-up messages";
  }
}

/* =========================
   COPY FUNCTIONS
========================= */

function copyListing() {
  const text = document.getElementById('listing-content')?.innerText || '';
  navigator.clipboard.writeText(text);

  const el = document.getElementById('copy-success');
  el?.classList.add('visible');

  setTimeout(() => el?.classList.remove('visible'), 2500);
}

/* =========================
   EMBED CODE (CLEANED)
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
  const label = document.getElementById('bubble-label')?.value || 'Get Started';
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
});
