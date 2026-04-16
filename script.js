let chatHistory = [];
let currentEmbedTab = 'full';

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
  chatHistory.push({ role: 'user', content: msg });

  const typingEl = appendMsg('Alex is typing...', 'bot typing');

  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: msg })
    });

    const data = await response.json();

    if (typingEl) typingEl.remove();

    if (!response.ok) {
      appendMsg('Server error: ' + (data.error || 'Unknown error'), 'bot');
      return;
    }

    appendMsg(data.reply, 'bot');
    chatHistory.push({ role: 'assistant', content: data.reply });
  } catch (error) {
    if (typingEl) typingEl.remove();
    appendMsg('Request failed: ' + error.message, 'bot');
  }
}

function selectSlot(btn, slotLabel) {
  document.querySelectorAll('.slot-btn:not(.taken)').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  appendMsg('I want to book the ' + slotLabel + ' slot.', 'user');
  document.getElementById('booking-confirm')?.classList.add('visible');
}

function copyListing() {
  const text = document.getElementById('listing-content')?.innerText || '';
  navigator.clipboard.writeText(text);
  document.getElementById('copy-success')?.classList.add('visible');
  setTimeout(() => {
    document.getElementById('copy-success')?.classList.remove('visible');
  }, 2500);
}

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
  const label = document.getElementById('bubble-label')?.value || 'Book a Showing';
  const pos = document.getElementById('bubble-pos')?.value || 'bottom-right';

  let code = '';

  if (currentEmbedTab === 'full') {
    code = `<!-- PropAI Widget - ${agency} -->
<iframe
  src="https://propai.app/widget?agency=${encodeURIComponent(agency)}&color=${encodeURIComponent(color)}&tools=${tools}"
  width="100%"
  height="720"
  frameborder="0"
  allow="clipboard-write"
  style="border-radius:16px;overflow:hidden">
</iframe>`;
  } else if (currentEmbedTab === 'chat') {
    code = `<!-- PropAI Chat Bubble - ${agency} -->
<script>
  window.PropAIConfig = {
    agencyName: "${agency}",
    primaryColor: "${color}",
    buttonLabel: "${label}",
    position: "${pos}"
  };
<\/script>
<script src="https://propai.app/embed.js" async><\/script>`;
  } else {
    code = `/* WordPress - add to functions.php or a plugin */
function propai_widget() {
  echo '<iframe
    src="https://propai.app/widget?agency=${encodeURIComponent(agency)}&color=${encodeURIComponent(color)}&tools=${tools}"
    width="100%" height="720"
    frameborder="0"
    style="border-radius:16px">
  </iframe>';
}
add_shortcode('propai', 'propai_widget');
/* Then use [propai] shortcode in any page/post */`;
  }

  const block = document.getElementById('embed-code-block');
  if (block) block.innerText = code;
}

function copyEmbedCode() {
  const text = document.getElementById('embed-code-block')?.innerText || '';
  navigator.clipboard.writeText(text);
}

document.addEventListener('DOMContentLoaded', () => {
  updateEmbedCode();
});
