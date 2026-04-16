let chatHistory = [];

function appendMsg(text, cls) {
  const container = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.className = 'msg ' + cls;
  el.innerText = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
}

async function sendChat() {
  const input = document.getElementById('chat-input');
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
      body: JSON.stringify({
        message: msg
      })
    });

    const data = await response.json();

    typingEl.remove();

    if (!response.ok) {
      appendMsg('Server error: ' + (data.error || 'Unknown error'), 'bot');
      return;
    }

    appendMsg(data.reply, 'bot');
    chatHistory.push({ role: 'assistant', content: data.reply });

  } catch (error) {
    typingEl.remove();
    appendMsg('Request failed: ' + error.message, 'bot');
  }
}

function selectSlot(btn, slotLabel) {
  document.querySelectorAll('.slot-btn:not(.taken)').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  appendMsg('I want to book the ' + slotLabel + ' slot.', 'user');

  document.getElementById('booking-confirm').classList.add('visible');
}
