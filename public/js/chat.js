const chatState = { history: [] };

function appendMessage(text, role) {
  const container = document.getElementById("chat-messages");
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.textContent = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
}

function appendSources(sources) {
  if (!sources || sources.length === 0) return;
  const container = document.getElementById("chat-messages");
  const el = document.createElement("div");
  el.className = "msg sources";
  el.textContent = `Source: ${sources.join(", ")}`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function initChat() {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    appendMessage(message, "user");
    chatState.history.push({ role: "user", content: message });
    input.value = "";

    const thinking = appendMessage("Thinking…", "bot");

    try {
      const { reply, sources } = await api.sendChatMessage(message, chatState.history);
      thinking.textContent = reply;
      chatState.history.push({ role: "assistant", content: reply });
      appendSources(sources);
    } catch (err) {
      thinking.textContent = "Sorry, I couldn't reach the assistant. Please try again.";
    }
  });
}
