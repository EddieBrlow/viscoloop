// --- Theme (light/dark) -------------------------------------------------
function applyTheme(theme) {
  if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
  else document.documentElement.removeAttribute("data-theme");
  document.getElementById("theme-toggle").textContent = theme === "light" ? "☀️" : "🌙";
}

(function initTheme() {
  let saved = "dark";
  try { saved = localStorage.getItem("viscoloop-theme") || "dark"; } catch {}
  applyTheme(saved);
})();

document.getElementById("theme-toggle").addEventListener("click", () => {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const next = isLight ? "dark" : "light";
  applyTheme(next);
  try { localStorage.setItem("viscoloop-theme", next); } catch {}
});

// --- Navigation -------------------------------------------------------
function showView(view) {
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === `view-${view}`));
  window.scrollTo({ top: 0 });
}

document.querySelectorAll(".go-to").forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.view));
});

// --- Modal helpers ------------------------------------------------------
function openModal(id) { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }
document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => btn.closest(".modal-backdrop").style.display = "none");
});

// --- Utilities -------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

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
      <div class="tile-icon">${doc.type === "file" ? "📎" : "🔗"}</div>
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

// --- Generic "list of link resources" sections: Company Tools, HR, Work Guides ---
function createLinkGrid({ gridId, addBtnId, formId, modalId, apiGet, apiAdd, apiDelete, nameField, emptyText }) {
  let cache = [];

  async function load() {
    cache = await apiGet();
    render();
  }

  function render() {
    const grid = document.getElementById(gridId);
    if (cache.length === 0) {
      grid.innerHTML = `<div class="empty-state">${emptyText}</div>`;
      return;
    }
    grid.innerHTML = "";
    cache.forEach((item) => {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.innerHTML = `
        <div class="tile-icon">${escapeHtml(item.icon || "🔗")}</div>
        <div class="title">${escapeHtml(item[nameField])}</div>
        <div class="desc">${escapeHtml(item.description || "")}</div>
        <div class="meta">${escapeHtml(item.category || "")}</div>
        <div class="tile-actions">
          <button class="btn btn-secondary" data-open>Open</button>
          <button class="btn btn-danger" data-delete>Delete</button>
        </div>
      `;
      tile.querySelector("[data-open]").addEventListener("click", () => window.open(item.url, "_blank"));
      tile.querySelector("[data-delete]").addEventListener("click", async () => {
        if (!confirm(`Remove "${item[nameField]}"?`)) return;
        await apiDelete(item.id);
        await load();
      });
      grid.appendChild(tile);
    });
  }

  document.getElementById(addBtnId).addEventListener("click", () => openModal(modalId));
  document.getElementById(formId).addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const payload = {};
    for (const [key, value] of data.entries()) payload[key] = value;
    try {
      await apiAdd(payload);
      form.reset();
      closeModal(modalId);
      await load();
    } catch (err) {
      alert(err.message);
    }
  });

  return { load };
}

const toolsSection = createLinkGrid({
  gridId: "tools-grid", addBtnId: "add-tool-btn", formId: "tool-form", modalId: "tool-modal",
  apiGet: api.getTools, apiAdd: api.addTool, apiDelete: api.deleteTool,
  nameField: "name", emptyText: "No tools added yet. Add links to the platforms your team uses.",
});

const hrSection = createLinkGrid({
  gridId: "hr-grid", addBtnId: "add-hr-btn", formId: "hr-form", modalId: "hr-modal",
  apiGet: api.getHrResources, apiAdd: api.addHrResource, apiDelete: api.deleteHrResource,
  nameField: "title", emptyText: "No HR resources added yet.",
});

const workGuidesSection = createLinkGrid({
  gridId: "workguides-grid", addBtnId: "add-workguide-btn", formId: "workguide-form", modalId: "workguide-modal",
  apiGet: api.getWorkGuides, apiAdd: api.addWorkGuide, apiDelete: api.deleteWorkGuide,
  nameField: "title", emptyText: "No work guides added yet.",
});

// --- Team Directory -------------------------------------------------------
async function loadTeam() {
  const people = await api.getTeam();
  const grid = document.getElementById("team-grid");

  if (people.length === 0) {
    grid.innerHTML = `<div class="empty-state">No teammates added yet.</div>`;
    return;
  }

  grid.innerHTML = "";
  people.forEach((person) => {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <div class="tile-icon">👤</div>
      <div class="title">${escapeHtml(person.name)}</div>
      <div class="desc">${escapeHtml(person.role || "")}</div>
      <div class="meta">${escapeHtml(person.department)}</div>
      ${person.phone ? `<div class="desc">📞 ${escapeHtml(person.phone)}</div>` : ""}
      ${person.email ? `<div class="desc">✉️ ${escapeHtml(person.email)}</div>` : ""}
      <div class="tile-actions">
        <button class="btn btn-danger" data-delete>Delete</button>
      </div>
    `;
    tile.querySelector("[data-delete]").addEventListener("click", async () => {
      if (!confirm(`Remove "${person.name}"?`)) return;
      await api.deletePerson(person.id);
      await loadTeam();
    });
    grid.appendChild(tile);
  });
}

document.getElementById("add-person-btn").addEventListener("click", () => openModal("person-modal"));

document.getElementById("person-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  try {
    await api.addPerson({
      name: data.get("name"),
      role: data.get("role"),
      department: data.get("department"),
      phone: data.get("phone"),
      email: data.get("email"),
    });
    form.reset();
    closeModal("person-modal");
    await loadTeam();
  } catch (err) {
    alert(err.message);
  }
});

// --- Leadership unlock -------------------------------------------------
let leadershipUnlocked = false;
let leadershipOpenMode = false;

function updateLeadershipButton() {
  const btn = document.getElementById("leadership-toggle");
  btn.textContent = leadershipUnlocked ? "🔓 Leadership" : "🔒 Leadership";
  btn.title = leadershipUnlocked ? "Click to lock leadership controls again" : "Click to unlock leadership controls";
  btn.classList.toggle("active", leadershipUnlocked);
}

document.getElementById("leadership-toggle").addEventListener("click", () => {
  if (leadershipUnlocked) {
    leadershipUnlocked = false;
    sessionStorage.removeItem("viscoloop-leadership-passcode");
    updateLeadershipButton();
    renderSuggestionsBoard();
    return;
  }
  openModal("leadership-modal");
});

document.getElementById("leadership-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const passcode = new FormData(e.target).get("passcode");
  try {
    await api.unlockLeadership(passcode);
    sessionStorage.setItem("viscoloop-leadership-passcode", passcode || "");
    leadershipUnlocked = true;
    updateLeadershipButton();
    e.target.reset();
    closeModal("leadership-modal");
    renderSuggestionsBoard();
  } catch (err) {
    alert(err.message);
  }
});

async function initLeadershipState() {
  try {
    const result = await api.unlockLeadership("");
    if (result.openMode) {
      leadershipOpenMode = true;
      leadershipUnlocked = true;
    }
  } catch {
    leadershipUnlocked = false;
  }
  updateLeadershipButton();
}

// --- Suggestions -------------------------------------------------------
let suggestionsCache = [];
let SUGGESTION_STATUSES = [];
let SUGGESTION_CATEGORIES = [];
let SUGGESTION_URGENCIES = [];

const STATUS_HINTS = {
  Submitted: "New idea received from a team member.",
  "In Review": "Leadership is reviewing for impact and feasibility.",
  Approved: "Endorsed to move forward — needs an owner and a plan.",
  "Action Plan": "Defining steps, an owner, and a target date.",
  "In Progress": "The improvement is being piloted or rolled out.",
  Implemented: "Change is live — verifying results before closing.",
  Deferred: "Not approved or parked. Reason recorded and shared back.",
  Closed: "Complete. Outcome and lessons recorded.",
};

async function loadSuggestionMeta() {
  const meta = await api.getSuggestionMeta();
  SUGGESTION_STATUSES = meta.statuses;
  SUGGESTION_CATEGORIES = meta.categories;
  SUGGESTION_URGENCIES = meta.urgencies;

  const catSelect = document.getElementById("suggestion-category");
  catSelect.innerHTML = SUGGESTION_CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");
  const urgSelect = document.getElementById("suggestion-urgency");
  urgSelect.innerHTML = SUGGESTION_URGENCIES.map((u) => `<option value="${u}" ${u === "Medium" ? "selected" : ""}>${u}</option>`).join("");
}

function renderSuggestionStats() {
  const total = suggestionsCache.length;
  const implemented = suggestionsCache.filter((s) => s.status === "Implemented").length;
  const inProgress = suggestionsCache.filter((s) => ["Approved", "Action Plan", "In Progress"].includes(s.status)).length;
  const open = suggestionsCache.filter((s) => !["Implemented", "Deferred", "Closed"].includes(s.status)).length;

  const stats = [
    { value: total, label: "Total ideas" },
    { value: inProgress, label: "In progress" },
    { value: implemented, label: "Implemented" },
    { value: open, label: "Open" },
  ];

  document.getElementById("suggestion-stats").innerHTML = stats
    .map((s) => `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`)
    .join("");

  const openCount = document.getElementById("home-suggestions-count");
  if (open > 0) {
    openCount.textContent = open;
    openCount.hidden = false;
  } else {
    openCount.hidden = true;
  }
}

function suggestionCardHtml(sugg) {
  return `
    <div class="kanban-card" data-id="${sugg.id}">
      <div class="kanban-card-tags">
        <span class="tag-pill">${escapeHtml(sugg.category)}</span>
        ${sugg.urgency === "High" ? `<span class="tag-pill tag-urgent">High priority</span>` : ""}
      </div>
      <div class="kanban-card-title">${escapeHtml(sugg.title)}</div>
      <div class="kanban-card-desc">${escapeHtml(sugg.problem || sugg.solution || "")}</div>
      <div class="kanban-card-meta">${escapeHtml(sugg.submittedBy)}${sugg.role ? ` · ${escapeHtml(sugg.role)}` : ""}</div>
      <div class="kanban-card-meta">${timeAgo(sugg.updatedAt)}</div>
    </div>
  `;
}

function renderSuggestionsBoard() {
  const board = document.getElementById("suggestions-board");
  board.innerHTML = SUGGESTION_STATUSES.map((status) => {
    const items = suggestionsCache.filter((s) => s.status === status);
    return `
      <div class="kanban-column">
        <div class="kanban-column-header">
          <span>${status}</span>
          <span class="tile-badge" style="position:static">${items.length}</span>
        </div>
        <div class="kanban-column-hint">${STATUS_HINTS[status] || ""}</div>
        <div class="kanban-column-cards">
          ${items.length ? items.map(suggestionCardHtml).join("") : `<div class="kanban-empty">Empty</div>`}
        </div>
      </div>
    `;
  }).join("");

  board.querySelectorAll(".kanban-card").forEach((card) => {
    card.addEventListener("click", () => {
      const sugg = suggestionsCache.find((s) => s.id === card.dataset.id);
      if (sugg) openSuggestionDetail(sugg);
    });
  });
}

async function loadSuggestions() {
  suggestionsCache = await api.getSuggestions();
  renderSuggestionStats();
  renderSuggestionsBoard();
}

function openSuggestionDetail(sugg) {
  const statusOptions = SUGGESTION_STATUSES.map(
    (s) => `<option value="${s}" ${s === sugg.status ? "selected" : ""}>${s}</option>`
  ).join("");

  const commentsHtml = sugg.comments.map((c) => `
    <div class="comment">
      <div class="comment-meta"><strong>${escapeHtml(c.author)}</strong> · ${timeAgo(c.at)}</div>
      <div>${escapeHtml(c.text)}</div>
    </div>
  `).join("");

  const planSection = leadershipUnlocked ? `
    <div class="field"><label>Owner</label><input type="text" id="detail-owner" value="${escapeHtml(sugg.owner || "")}" placeholder="Who's driving this?" /></div>
    <div class="field"><label>Target date</label><input type="date" id="detail-target-date" value="${escapeHtml(sugg.targetDate || "")}" /></div>
    <div class="field"><label>Action steps</label><textarea id="detail-action-steps" rows="2" placeholder="Steps to get this done">${escapeHtml(sugg.actionSteps || "")}</textarea></div>
    <button class="btn btn-secondary" id="detail-save-plan">Save plan</button>
  ` : (sugg.owner || sugg.targetDate || sugg.actionSteps ? `
    <div class="field"><label>Owner</label><div>${escapeHtml(sugg.owner || "—")}</div></div>
    <div class="field"><label>Target date</label><div>${escapeHtml(sugg.targetDate || "—")}</div></div>
    <div class="field"><label>Action steps</label><div>${escapeHtml(sugg.actionSteps || "—")}</div></div>
  ` : "");

  document.getElementById("suggestion-detail-content").innerHTML = `
    <div class="row-between">
      <h3 style="margin:0">${escapeHtml(sugg.title)}</h3>
      <button class="btn btn-secondary" id="detail-close">Close</button>
    </div>
    <div class="kanban-card-tags" style="margin:10px 0">
      <span class="tag-pill">${escapeHtml(sugg.category)}</span>
      <span class="tag-pill">${escapeHtml(sugg.urgency)} priority</span>
      <span class="status-pill status-${slugify(sugg.status)}">${escapeHtml(sugg.status)}</span>
    </div>

    <div class="field">
      <label>Workflow status</label>
      ${leadershipUnlocked
        ? `<select id="detail-status">${statusOptions}</select>`
        : `<div class="hint" style="margin:0">🔒 Unlock leadership controls to change status, assign an owner, or edit the plan.</div>`}
    </div>

    <div class="field"><label>The problem</label><div>${escapeHtml(sugg.problem || "—")}</div></div>
    <div class="field"><label>Proposed solution</label><div>${escapeHtml(sugg.solution || "—")}</div></div>
    <div class="field"><label>Expected benefit</label><div>${escapeHtml(sugg.benefit || "—")}</div></div>
    <div class="meta">Submitted by ${escapeHtml(sugg.submittedBy)}${sugg.role ? ` · ${escapeHtml(sugg.role)}` : ""} · ${timeAgo(sugg.createdAt)}</div>

    ${planSection ? `<h4 style="margin:16px 0 4px">Action plan</h4>${planSection}` : ""}

    <h4 style="margin:16px 0 4px">Activity &amp; comments</h4>
    <div class="comments-list">${commentsHtml}</div>
    <div class="field"><textarea id="detail-comment-text" rows="2" placeholder="Add a comment or update…"></textarea></div>
    <div class="field"><input type="text" id="detail-comment-author" placeholder="Posting as (optional)" /></div>
    <button class="btn btn-secondary" id="detail-post-comment">Post</button>

    ${leadershipUnlocked ? `<button class="btn btn-danger" id="detail-delete" style="margin-top:16px">Delete suggestion</button>` : ""}
  `;

  document.getElementById("detail-close").addEventListener("click", () => closeModal("suggestion-detail-modal"));

  const statusSelect = document.getElementById("detail-status");
  if (statusSelect) {
    statusSelect.addEventListener("change", async (e) => {
      await api.setSuggestionStatus(sugg.id, e.target.value);
      closeModal("suggestion-detail-modal");
      await loadSuggestions();
    });
  }

  const savePlanBtn = document.getElementById("detail-save-plan");
  if (savePlanBtn) {
    savePlanBtn.addEventListener("click", async () => {
      await api.updateSuggestionPlan(sugg.id, {
        owner: document.getElementById("detail-owner").value,
        targetDate: document.getElementById("detail-target-date").value,
        actionSteps: document.getElementById("detail-action-steps").value,
      });
      closeModal("suggestion-detail-modal");
      await loadSuggestions();
    });
  }

  document.getElementById("detail-post-comment").addEventListener("click", async () => {
    const text = document.getElementById("detail-comment-text").value.trim();
    if (!text) return;
    const author = document.getElementById("detail-comment-author").value.trim() || "Anonymous";
    const updated = await api.addSuggestionComment(sugg.id, author, text);
    const idx = suggestionsCache.findIndex((s) => s.id === sugg.id);
    if (idx !== -1) suggestionsCache[idx] = updated;
    openSuggestionDetail(updated);
  });

  const deleteBtn = document.getElementById("detail-delete");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!confirm(`Delete "${sugg.title}"? This can't be undone.`)) return;
      await api.deleteSuggestion(sugg.id);
      closeModal("suggestion-detail-modal");
      await loadSuggestions();
    });
  }

  openModal("suggestion-detail-modal");
}

document.getElementById("add-suggestion-btn").addEventListener("click", () => openModal("suggestion-modal"));

document.getElementById("suggestion-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  try {
    await api.addSuggestion({
      title: data.get("title"),
      category: data.get("category"),
      urgency: data.get("urgency"),
      problem: data.get("problem"),
      solution: data.get("solution"),
      benefit: data.get("benefit"),
      submittedBy: data.get("submittedBy"),
      role: data.get("role"),
    });
    form.reset();
    closeModal("suggestion-modal");
    await loadSuggestions();
  } catch (err) {
    alert(err.message);
  }
});

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
toolsSection.load();
hrSection.load();
workGuidesSection.load();
loadTeam();
initLeadershipState().then(loadSuggestionMeta).then(loadSuggestions);
