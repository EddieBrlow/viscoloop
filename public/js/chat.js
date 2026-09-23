// "Ask Viscoman" — a search-bar style front end for the same /api/chat bot
// that used to live on its own page. Single question in, single answer out
// (no persisted conversation) — matches a search bar, not a chat thread.

function setViscomanFlying(active) {
  document.getElementById("viscoman-flyer").classList.toggle("flying", active);
}

function renderViscomanResult(question, answerText, sources) {
  const el = document.getElementById("viscoman-result");
  const sourcesHtml = sources && sources.length
    ? `<div class="viscoman-sources">Source: ${escapeHtml(sources.join(", "))}</div>`
    : "";
  el.innerHTML = `
    <div class="viscoman-answer">
      <div class="viscoman-question">${escapeHtml(question)}</div>
      <div class="viscoman-reply">${escapeHtml(answerText)}</div>
      ${sourcesHtml}
    </div>
  `;
}

function initChat() {
  const form = document.getElementById("viscoman-form");
  const input = document.getElementById("viscoman-input");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;

    setViscomanFlying(true);
    document.getElementById("viscoman-result").innerHTML = `<div class="viscoman-answer viscoman-thinking">Thinking…</div>`;

    try {
      const { reply, sources } = await api.sendChatMessage(question, []);
      renderViscomanResult(question, reply, sources);
    } catch (err) {
      renderViscomanResult(question, "Sorry, I couldn't reach the assistant. Please try again.", null);
    } finally {
      setViscomanFlying(false);
      input.value = "";
    }
  });
}
