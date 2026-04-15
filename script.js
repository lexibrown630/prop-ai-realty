async function sendMessage() {
  const input = document.querySelector('input[placeholder*="Type"]');
  const message = input.value.trim();

  if (!message) return;

  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    if (!response.ok) {
      alert("Server error: " + (data.error || "Unknown error"));
      return;
    }

    alert("Alex says: " + data.reply);
    input.value = "";
  } catch (error) {
    alert("Request failed: " + error.message);
  }
}

document.querySelector('button.bg-gold').onclick = sendMessage;