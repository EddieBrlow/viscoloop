// --- Navigation -------------------------------------------------------
function showView(view) {
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === `view-${view}`));
  document.querySelectorAll("nav.tabs button").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
}

document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-view]");
  if (btn) showView(btn.dataset.view);
});

document.querySelectorAll(".go-to").forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

// --- Modal helpers ------------------------------------------------------
function openModal(id) { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }
document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => btn.closest(".modal-backdrop").style.display = "none");
});

// --- Documents ----------------------------------------------------------
let documentsCache = [];
let activeCategory = null;

function renderDocumentCategories() {
  const categories = ["All", ...new Set(documentsCache.map((d) => d.category))];
  const el = document.getElementById("document-categories");
  el.innerHTML = "";
  categories.forEach((cat) => {
    const chip = document.createElement("button");
    chip.className = "chip" + ((activeCategory === cat || (cat === "All" && !activeCategory)) ? " active" : "");
    chip.textContent = cat;
    chip.addEventListener("click", () => {
      activeCategory = cat === "All" ? null : cat;
      renderDocumentCategories();
      renderDocuments();
    });
    el.appendChild(chip);
  });
}

function renderDocuments() {
  const grid = document.getElementById("document-grid");
  const items = activeCategory ? documentsCache.filter((d) => d.category === activeCategory) : documentsCache;

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state">No documents yet. Add a link or upload a file to get started.</div>`;
    return;
  }

  grid.innerHTML = "";
  items.forEach((doc) => {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <div class="icon">${doc.type === "file" ? "📎" : "🔗"}</div>
      <div class="title">${escapeHtml(doc.title)}</div>
      <div class="desc">${escapeHtml(doc.description || "")}</div>
      <div class="meta">${escapeHtml(doc.category)}</div>
      <div class="tile-actions">
        <button class="btn btn-secondary" data-open>Open</button>
        <button class="btn btn-danger" data-delete>Delete</button>
      </div>
    `;
    tile.querySelector("[data-open]").addEventListener("click", () => window.open(doc.url, "_blank"));
    tile.querySelector("[data-delete]").addEventListener("click", async () => {
      if (!confirm(`Remove "${doc.title}"?`)) return;
      await api.deleteDocument(doc.id);
      await loadDocuments();
    });
    grid.appendChild(tile);
  });
}

async function loadDocuments() {
  documentsCache = await api.getDocuments();
  renderDocumentCategories();
  renderDocuments();
}

document.getElementById("add-document-btn").addEventListener("click", () => openModal("document-modal"));

document.getElementById("document-type").addEventListener("change", (e) => {
  const isFile = e.target.value === "file";
  document.getElementById("document-url-field").style.display = isFile ? "none" : "block";
  document.getElementById("document-file-field").style.display = isFile ? "block" : "none";
});

document.getElementById("document-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  const type = data.get("type");

  try {
    if (type === "file") {
      await api.uploadDocument(data);
    } else {
      await api.addDocumentLink({
        title: data.get("title"),
        category: data.get("category"),
        description: data.get("description"),
        url: data.get("url"),
      });
    }
    form.reset();
    closeModal("document-modal");
    await loadDocuments();
  } catch (err) {
    alert(err.message);
  }
});

// --- Company Tools -------------------------------------------------------
async function loadTools() {
  const tools = await api.getTools();
  const grid = document.getElementById("tools-grid");

  if (tools.length === 0) {
    grid.innerHTML = `<div class="empty-state">No tools added yet. Add links to the platforms your team uses.</div>`;
    return;
  }

  grid.innerHTML = "";
  tools.forEach((tool) => {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <div class="icon">${escapeHtml(tool.icon || "🔗")}</div>
      <div class="title">${escapeHtml(tool.name)}</div>
      <div class="desc">${escapeHtml(tool.description || "")}</div>
      <div class="meta">${escapeHtml(tool.category)}</div>
      <div class="tile-actions">
        <button class="btn btn-secondary" data-open>Open</button>
        <button class="btn btn-danger" data-delete>Delete</button>
      </div>
    `;
    tile.querySelector("[data-open]").addEventListener("click", () => window.open(tool.url, "_blank"));
    tile.querySelector("[data-delete]").addEventListener("click", async () => {
      if (!confirm(`Remove "${tool.name}"?`)) return;
      await api.deleteTool(tool.id);
      await loadTools();
    });
    grid.appendChild(tile);
  });
}

document.getElementById("add-tool-btn").addEventListener("click", () => openModal("tool-modal"));

document.getElementById("tool-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  try {
    await api.addTool({
      name: data.get("name"),
      url: data.get("url"),
      category: data.get("category"),
      icon: data.get("icon"),
      description: data.get("description"),
    });
    form.reset();
    closeModal("tool-modal");
    await loadTools();
  } catch (err) {
    alert(err.message);
  }
});

// --- Suggestions -------------------------------------------------------
const SUGGESTION_STATUSES = ["Submitted", "Under Review", "Planned", "In Progress", "Implemented", "Declined"];
let suggestionsCache = [];
let activeSuggestionStatus = null;

function renderSuggestionStatusChips() {
  const el = document.getElementById("suggestion-statuses");
  el.innerHTML = "";
  ["All", ...SUGGESTION_STATUSES].forEach((status) => {
    const chip = document.createElement("button");
    chip.className = "chip" + ((activeSuggestionStatus === status || (status === "All" && !activeSuggestionStatus)) ? " active" : "");
    chip.textContent = status;
    chip.addEventListener("click", () => {
      activeSuggestionStatus = status === "All" ? null : status;
      renderSuggestionStatusChips();
      renderSuggestions();
    });
    el.appendChild(chip);
  });
}

function renderSuggestions() {
  const grid = document.getElementById("suggestions-grid");
  const items = activeSuggestionStatus
    ? suggestionsCache.filter((s) => s.status === activeSuggestionStatus)
    : suggestionsCache;

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state">No suggestions here yet. Be the first to submit one!</div>`;
    return;
  }

  grid.innerHTML = "";
  items.forEach((sugg) => {
    const tile = document.createElement("div");
    tile.className = "tile";

    const statusOptions = SUGGESTION_STATUSES.map(
      (s) => `<option value="${s}" ${s === sugg.status ? "selected" : ""}>${s}</option>`
    ).join("");

    tile.innerHTML = `
      <span class="status-pill status-${slugifyStatus(sugg.status)}">${escapeHtml(sugg.status)}</span>
      <div class="title">${escapeHtml(sugg.title)}</div>
      <div class="desc">${escapeHtml(sugg.description || "")}</div>
      <div class="meta">${escapeHtml(sugg.category)} · submitted by ${escapeHtml(sugg.submittedBy)}</div>
      <div class="field" style="margin-top:6px">
        <label>Move to</label>
        <select data-status-select>${statusOptions}</select>
      </div>
      <div class="tile-actions">
        <button class="btn btn-danger" data-delete>Delete</button>
      </div>
    `;
    tile.querySelector("[data-status-select]").addEventListener("change", async (e) => {
      await api.setSuggestionStatus(sugg.id, e.target.value);
      await loadSuggestions();
    });
    tile.querySelector("[data-delete]").addEventListener("click", async () => {
      if (!confirm(`Remove "${sugg.title}"?`)) return;
      await api.deleteSuggestion(sugg.id);
      await loadSuggestions();
    });
    grid.appendChild(tile);
  });
}

function slugifyStatus(status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

async function loadSuggestions() {
  suggestionsCache = await api.getSuggestions();
  renderSuggestions();
}

document.getElementById("add-suggestion-btn").addEventListener("click", () => openModal("suggestion-modal"));

document.getElementById("suggestion-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  try {
    await api.addSuggestion({
      title: data.get("title"),
      description: data.get("description"),
      category: data.get("category"),
      submittedBy: data.get("submittedBy"),
    });
    form.reset();
    closeModal("suggestion-modal");
    await loadSuggestions();
  } catch (err) {
    alert(err.message);
  }
});

renderSuggestionStatusChips();

// --- Utilities -------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// --- PWA install prompt -------------------------------------------------
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById("install-banner").classList.add("show");
});
document.getElementById("install-btn").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  await deferredInstallPrompt.prompt();
  document.getElementById("install-banner").classList.remove("show");
});

// --- Service worker -------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}

// --- Init -------------------------------------------------------
initChat();
loadDocuments();
loadTools();
loadSuggestions();
