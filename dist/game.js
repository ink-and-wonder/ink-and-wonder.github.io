import { CATALOGUE, SIGILS, SIGNS } from "./vocabulary.js?v=3.0.3";
import { compileSpell, compositionPaths } from "./compiler.js?v=3.0.3";
import {
  ELEMENTS,
  MODIFIERS,
  CHAPTERS,
  MISSIONS,
  OBJECT_NAMES,
  RANKS,
} from "./data.js?v=3.0.3";
import {
  recognize,
  checkObjective,
  heart,
  sign,
  recipePaths,
  distance,
  validateDrawing,
} from "./engine.js?v=3.0.3";
import {
  SAVE_KEY,
  freshSave,
  validateSave,
  available,
  nextMission,
  insight,
  completeMission,
} from "./state.js?v=3.0.3";
import { AtelierMusic } from "./music.js?v=3.0.3";
import { DrawingDesk } from "./drawing.js?v=3.0.3";
import { objectArt, WorldEffects } from "./world.js?v=3.0.3";
import { CLOUD_CONFIG } from "./cloud-config.js?v=3.0.3";
import { CloudAccount, accountSaveKey, hasStory, cloudError } from "./cloud.js?v=3.0.3";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const stars = (n) =>
  `<span class="stars" aria-label="${n} of 3 stars">${[1, 2, 3].map((i) => `<span class="${i <= n ? "earned" : ""}">✦</span>`).join("")}</span>`;
let save = freshSave(),
  saveError = false,
  hadSave = false;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    save = validateSave(JSON.parse(raw));
    hadSave = true;
  }
} catch {
  saveError = true;
}
if (!hadSave && matchMedia("(prefers-reduced-motion: reduce)").matches)
  save.settings.reducedMotion = true;
let installPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
});
let page = "journey",
  desk = null,
  effects = null,
  missionIndex = 0,
  stepIndex = 0,
  scores = [],
  usedGuide = false,
  assisted = true,
  busy = false,
  stageFinished = false,
  lastResult = null,
  lastReward = null,
  studioRecipe = { element: "light", modifier: "focus", signs: 1 },
  studioStrokes = [],
  studioScene = "atelier",
  studioGuide = false,
  bookTab = "seals",
  toastTimer,
  timers = [],
  audioContext;
const music = new AtelierMusic(() => save.settings.music);
document.addEventListener("pointerdown",()=>music.start(),{passive:true});
document.addEventListener("keydown",()=>music.start());
document.addEventListener("visibilitychange",()=>music.sync());
let guidePage = 0, atlasKind = "all", atlasQuery = "";
let activeUser = null,
  localSaveKey = SAVE_KEY,
  accountMode = "signin",
  cloudState = {
    phase: "unconfigured",
    configured: false,
    user: null,
    message: "Cloud saves are being prepared.",
  };
const cloud = new CloudAccount({
  config: CLOUD_CONFIG,
  storage: localStorage,
  getSave: () => save,
  onIdentity: switchAccount,
  onSave: restoreCloudStory,
  onStatus: (state) => {
    cloudState = state;
    updateAccountUi();
  },
  onRecovery: () => showAccount("recovery"),
});
try {
  const draft = JSON.parse(
    sessionStorage.getItem("ink-wonder-draft") || "null",
  );
  if (validateDrawing(draft)) studioStrokes = draft;
} catch {}
function persist() {
  try {
    localStorage.setItem(localSaveKey, JSON.stringify(save));
    $("#saveStatus").textContent = "Progress saved on this device";
  } catch {
    $("#saveStatus").textContent = "Storage unavailable · export your save";
    toast("Your browser could not save progress. Use Settings → Export save.");
  }
  updateHeader();
  cloud.changed();
}
function updateHeader() {
  const count = Object.keys(save.completed).length,
    rank = count === 12 ? 3 : count >= 8 ? 2 : count >= 4 ? 1 : 0;
  $("#playerRank").innerHTML =
    `${RANKS[rank]}<small id="xpLabel">${insight(save)} insight · ${count}/12 moments</small>`;
  $("#continueGame").innerHTML =
    `${count ? "Continue your story" : "Begin your story"} ${icon("arrow")}`;
  document.body.classList.toggle("large-text", save.settings.largeText);
  document.body.classList.toggle("reduced-motion", save.settings.reducedMotion);
  updateAccountUi();
}
function toast(text) {
  clearTimeout(toastTimer);
  $("#toast").textContent = text;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4200);
}
function later(fn, time) {
  const id = setTimeout(fn, time);
  timers.push(id);
  return id;
}
function cleanup() {
  if (page === "studio" && desk) studioStrokes = structuredClone(desk.strokes);
  desk?.destroy();
  effects?.destroy();
  desk = null;
  effects = null;
  for (const timer of timers) clearTimeout(timer);
  timers = [];
  busy = false;
  stageFinished = false;
}
function openDialog(html) {
  $("#dialogBody").innerHTML = html;
  if (!$("#dialog").open) $("#dialog").showModal();
}
function closeDialog() {
  $("#dialog").close();
}
function updateAccountUi() {
  const label = $("#accountLabel"),
    title = $("#titleAccount"),
    footer = $("#saveStatus");
  if (!label) return;
  const user = cloudState.user,
    name =
      user?.user_metadata?.display_name ||
      user?.email?.split("@")[0] ||
      "Apprentice";
  label.innerHTML = user
    ? `${escape(name.slice(0, 24))}<small>${cloudState.phase === "conflict" ? "Choose a save" : cloudState.pending ? "Sync pending" : "My account"}</small>`
    : "Sign in<small>Cloud saves</small>";
  title.innerHTML = user
    ? `Welcome back, ${escape(name.slice(0, 30))} <span>↗</span>`
    : "Sign in · keep your story with you <span>↗</span>";
  if (user) footer.textContent = cloudState.message;
  else footer.textContent = "Guest story · saved on this device";
  $("#accountButton").classList.toggle(
    "needs-attention",
    cloudState.phase === "conflict" || cloudState.phase === "error",
  );
  $$(".account-status-text").forEach(
    (node) => (node.textContent = cloudState.message),
  );
  const dashboard = $("#accountDashboard");
  if (dashboard && dashboard.dataset.phase !== cloudState.phase) showAccount();
}
function rememberDraft(key) {
  if (page !== "studio" || !desk) return;
  try {
    sessionStorage.setItem(key + ":draft", JSON.stringify(desk.strokes));
  } catch {}
}
function switchAccount(user) {
  rememberDraft(localSaveKey);
  cleanup();
  activeUser = user;
  localSaveKey = accountSaveKey(user?.id);
  studioStrokes = [];
  try {
    const draft = JSON.parse(
      sessionStorage.getItem(localSaveKey + ":draft") || "null",
    );
    if (validateDrawing(draft)) studioStrokes = draft;
  } catch {}
  try {
    const raw = localStorage.getItem(localSaveKey);
    save = raw ? validateSave(JSON.parse(raw)) : freshSave();
  } catch {
    save = freshSave();
    toast(
      "The device copy could not be read. Cloud recovery will be attempted.",
    );
  }
  updateHeader();
  if (!$("#gameScreen").classList.contains("hidden")) navigate("journey");
}
function restoreCloudStory(payload) {
  save = validateSave(payload);
  try {
    localStorage.setItem(localSaveKey, JSON.stringify(save));
  } catch {
    toast(
      "The cloud story loaded, but this browser could not keep an offline copy.",
    );
  }
  if (desk) desk.settings = save.settings;
  updateHeader();
  if (!$("#gameScreen").classList.contains("hidden")) {
    if (page === "journey") renderJourney();
    else if (page === "grimoire") renderGrimoire();
  }
}
function readGuestStory() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? validateSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
function storySummary(payload) {
  return `${Object.keys(payload.completed).length} moments · ${payload.seals.length} grimoire pages`;
}
function authRedirectUrl() {
  return new URL("./", location.href).href;
}
function showAccount(mode = "signin") {
  accountMode = mode;
  if (activeUser && mode !== "recovery") {
    const guest = readGuestStory(),
      backup = (() => {
        try {
          return localStorage.getItem(localSaveKey + ":backup");
        } catch {
          return null;
        }
      })();
    const conflict = cloudState.conflict;
    openDialog(
      `<div class="dialog-content" id="accountDashboard" data-phase="${cloudState.phase}"><div class="account-crest">${icon("book")}</div><span class="overline">YOUR PLACE IN THE ATELIER</span><h2>Welcome back, ${escape((activeUser.user_metadata?.display_name || "apprentice").slice(0, 40))}.</h2><p class="account-email">${escape(activeUser.email || "")}</p><div class="cloud-status ${cloudState.phase}" role="status"><span class="status-dot"></span><span class="account-status-text">${escape(cloudState.message)}</span></div><div class="account-story-summary"><b>${Object.keys(save.completed).length}<small>moments</small></b><b>${save.seals.length}<small>saved pages</small></b><b>${save.discoveries.length}<small>discoveries</small></b></div>${conflict ? `<section class="sync-conflict"><span class="overline">TWO VERSIONS OF YOUR STORY</span><p>This device and the cloud both have changes. Choose a version; neither is replaced automatically.</p><button class="conflict-choice" data-account="use-cloud"><b>Use the cloud story</b><small>${storySummary(conflict.remote?.payload || freshSave())}</small><span>Keep a local backup of the device copy.</span></button><button class="conflict-choice" data-account="use-device"><b>Keep this device’s story</b><small>${storySummary(save)}</small><span>Replace the cloud version with this copy.</span></button><button class="text-button" data-act="export">Export this device’s copy first ↓</button></section>` : `<button class="button dark wide" data-account="sync" ${cloudState.phase === "syncing" ? "disabled" : ""}>${cloudState.phase === "syncing" ? "Syncing…" : "Sync now"} ${icon("spark")}</button>`}${guest && hasStory(guest) ? `<div class="guest-transfer"><h3>Your guest story is still here.</h3><p>${storySummary(guest)}. Bring it into this account when you are ready.</p><button class="text-button" data-account="import-guest" ${cloudState.phase === "syncing" ? "disabled" : ""}>Bring guest progress into this account ↗</button></div>` : ""}${backup ? '<button class="text-button" data-account="download-backup">Download the displaced device backup ↓</button>' : ""}<div class="account-bottom-actions"><button class="text-button" data-account="change-password">Change password</button><button class="text-button" data-account="signout">Sign out on this device</button></div><p class="auth-privacy">Your story belongs to your account. Guest progress and other accounts stay separate on this device.</p></div>`,
    );
    return;
  }
  if (!cloudState.configured || cloudState.phase === "unavailable") {
    openDialog(
      `<div class="dialog-content auth-intro"><div class="account-crest">${icon("book")}</div><span class="overline">A STORY THAT TRAVELS WITH YOU</span><h2>Your own place in the atelier.</h2><p>Sign in to carry your journey, keepsakes, and spellbook between devices.</p><div class="cloud-status"><span class="status-dot"></span><span>${cloudState.phase === "unavailable" ? "Sign-in is available in the web edition. You can continue as a guest here." : "Cloud accounts have not been connected for this build yet. Your guest story is still saved on this device."}</span></div><button class="button dark wide" data-account="guest">Continue as guest ${icon("quill")}</button><p class="auth-privacy">You can export your story from Settings and bring it into an account once cloud saves are available.</p></div>`,
    );
    return;
  }
  const signup = mode === "signup",
    reset = mode === "reset",
    recovery = mode === "recovery",
    confirm = mode === "confirm";
  openDialog(
    `<div class="dialog-content auth-intro"><div class="account-crest">${icon("quill")}</div><span class="overline">${recovery ? "A FRESH START" : signup ? "A PLACE FOR YOUR STORY" : "WELCOME TO THE ATELIER"}</span><h2>${recovery ? "Choose a new password." : reset ? "Find your way back." : confirm ? "A letter is on its way." : signup ? "Every witch has a story." : "Your story is waiting."}</h2><p>${recovery ? "Your recovery link is ready. Set a new password to continue." : reset ? "We’ll send a password reset link to your email." : confirm ? "Confirm your email using the link we sent, then return here to sign in." : "Keep your private grimoire across devices."}</p>${!reset && !recovery && !confirm ? `<div class="auth-tabs"><button data-account="signin" class="${!signup ? "active" : ""}">Sign in</button><button data-account="signup" class="${signup ? "active" : ""}">Create account</button></div>` : ""}<form id="authForm" data-mode="${mode}">${signup ? '<label class="form-label">Your name<input name="displayName" autocomplete="nickname" maxlength="40" placeholder="What should we call you?" required></label>' : ""}${!recovery ? '<label class="form-label">Email address<input name="email" type="email" autocomplete="username" inputmode="email" maxlength="254" placeholder="you@example.com" required></label>' : ""}${!reset && !confirm ? `<label class="form-label">${recovery ? "New password" : "Password"}<input name="password" type="password" autocomplete="${signup || recovery ? "new-password" : "current-password"}" minlength="${signup || recovery ? 8 : 1}" maxlength="128" ${signup || recovery ? 'placeholder="At least 8 characters"' : ""} required></label>` : ""}<p id="authMessage" class="auth-message" role="status" aria-live="polite"></p><button class="button dark wide" type="submit">${recovery ? "Save new password" : reset ? "Send reset link" : confirm ? "Resend confirmation email" : signup ? "Create my account" : "Sign in"} ${icon("arrow")}</button></form>${!signup && !reset && !recovery && !confirm ? '<button class="text-button auth-forgot" data-account="reset">Forgot your password?</button>' : ""}${reset || confirm ? '<button class="text-button auth-forgot" data-account="signin">← Back to sign in</button>' : ""}<button class="auth-guest" data-account="guest">Continue as guest</button><p class="auth-privacy">Private cloud saves. Passwords stay with the account service.</p></div>`,
  );
}
async function submitAccount(form) {
  if (form.reportValidity && !form.reportValidity()) return;
  const field = (name) => form.querySelector(`[name="${name}"]`)?.value || "",
    mode = form.dataset.mode,
    email = field("email"),
    password = field("password"),
    name = field("displayName"),
    message = $("#authMessage"),
    button = form.querySelector('[type="submit"]');
  if ((mode === "signup" || mode === "recovery") && password.length < 8) {
    message.textContent = "Use at least 8 characters for your password.";
    return;
  }
  if (mode === "signup" && !name.trim()) {
    message.textContent = "Please choose a name for your account.";
    return;
  }
  button.disabled = true;
  message.className = "auth-message";
  message.textContent = "Opening your place in the atelier…";
  try {
    if (mode === "signin") {
      await cloud.signIn(email, password);
      if (form.isConnected) showAccount();
    } else if (mode === "signup") {
      const signedIn = await cloud.signUp(
        email,
        password,
        name,
        authRedirectUrl(),
      );
      if (form.isConnected) {
        showAccount(signedIn ? "signin" : "confirm");
        const emailField = $('#authForm [name="email"]');
        if (emailField) emailField.value = email;
      }
    } else if (mode === "reset") {
      await cloud.resetPassword(email, authRedirectUrl());
      if (form.isConnected) {
        message.textContent =
          "If this address has an account, a reset link is on its way. Check your inbox and spam folder.";
        message.classList.add("success");
      }
    } else if (mode === "confirm") {
      await cloud.resendConfirmation(email, authRedirectUrl());
      if (form.isConnected) {
        message.textContent =
          "If confirmation is needed, a new email is on its way.";
        message.classList.add("success");
      }
    } else if (mode === "recovery") {
      await cloud.updatePassword(password);
      if (form.isConnected) showAccount();
      toast("Your password has been updated.");
    }
  } catch (error) {
    if (form.isConnected) {
      message.textContent = cloudError(error);
      message.classList.add("error");
    }
  } finally {
    if (form.isConnected) button.disabled = false;
    const passwordField = form.querySelector('[name="password"]');
    if (passwordField) passwordField.value = "";
  }
}
document.addEventListener("submit", (event) => {
  if (event.target.id === "authForm") {
    event.preventDefault();
    submitAccount(event.target);
  }
});
document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-account]");
  if (!button || button.disabled) return;
  const action = button.dataset.account;
  if (action === "open") showAccount();
  else if (["signin", "signup", "reset", "confirm"].includes(action))
    showAccount(action);
  else if (action === "guest") closeDialog();
  else if (action === "change-password") showAccount("recovery");
  else if (action === "sync") {
    button.disabled = true;
    await cloud.sync();
    if ($("#accountDashboard")) showAccount();
  } else if (action === "use-cloud" || action === "use-device") {
    button.disabled = true;
    try {
      await cloud.resolveConflict(action === "use-cloud" ? "cloud" : "device");
      if ($("#accountDashboard")) showAccount();
    } catch {
      toast(
        "The backup could not be saved. Export your device story before switching versions.",
      );
      button.disabled = false;
    }
  } else if (action === "signout") {
    button.disabled = true;
    try {
      if (!cloud.conflict) await cloud.sync();
      await cloud.signOut();
      showAccount();
      toast("Signed out. Your guest story is ready on this device.");
    } catch (error) {
      toast(cloudError(error));
      button.disabled = false;
    }
  } else if (action === "import-guest") {
    const guest = readGuestStory();
    if (!guest) return;
    openDialog(
      `<div class="dialog-content"><span class="overline">BRING YOUR STORY WITH YOU</span><h2>Continue your guest journey?</h2><p>Your guest story has ${storySummary(guest)}. Your account currently has ${storySummary(save)}.</p><p>Using the guest story replaces the account’s current story and syncs it to the cloud. The original guest copy stays on this device.</p><div class="dialog-actions"><button class="button light" data-act="export">Export account story first ↓</button><button class="button dark" data-account="confirm-guest">Use my guest story</button></div></div>`,
    );
  } else if (action === "confirm-guest") {
    const guest = readGuestStory();
    if (!guest || !activeUser) return;
    cleanup();
    save = guest;
    persist();
    closeDialog();
    enter("journey");
    toast("Your guest story is now part of this account.");
  } else if (action === "download-backup") {
    try {
      const text = localStorage.getItem(localSaveKey + ":backup");
      if (!text) return;
      const url = URL.createObjectURL(
          new Blob([text], { type: "application/json" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "ink-and-wonder-device-backup.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast("The device backup could not be downloaded.");
    }
  }
});
function enter(next = "journey") {
  $("#titleScreen").classList.add("hidden");
  $("#gameScreen").classList.remove("hidden");
  navigate(next);
}
function navigate(next) {
  cleanup();
  page = next;
  $$("[data-page]").forEach((b) =>
    b.classList.toggle(
      "active",
      b.dataset.page === next ||
        (next === "mission" && b.dataset.page === "journey"),
    ),
  );
  if (next === "journey") renderJourney();
  else if (next === "studio") renderStudio();
  else if (next === "grimoire") renderGrimoire();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function svgPaths(paths, viewBox = "-1.15 -1.15 2.3 2.3") {
  return `<svg viewBox="${viewBox}" class="seal-preview" fill="none" aria-hidden="true">${paths.map((p) => `<path d="${p.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(3)},${q.y.toFixed(3)}`).join(" ")}"/>`).join("")}</svg>`;
}
function layoutDeck(deck) {
 if(!deck)return;
 const cards=[...deck.children].filter(e=>e.tagName!=="NAV"),size=deck.classList.contains("chapter-grid")?1:deck.classList.contains("memory-list")?3:(window.innerWidth||1200)<650?2:3;
 const total=Math.max(1,Math.ceil(cards.length/size)),current=Math.max(0,Math.min(total-1,Number(deck.dataset.current)||0));
 cards.forEach((card,i)=>card.hidden=Math.floor(i/size)!==current);
 deck.querySelector(":scope > nav")?.remove();
 if(total>1){const nav=document.createElement("nav");nav.className="deck-turns";nav.innerHTML=`<button data-act="deck-page" data-deck="${deck.id}" data-index="${current-1}" ${current===0?"disabled":""}>←</button><span>${current+1} / ${total}</span><button data-act="deck-page" data-deck="${deck.id}" data-index="${current+1}" ${current===total-1?"disabled":""}>→</button>`;deck.append(nav);}
}
function paginateCollections() {
 $$(".chapter-grid,.seal-grid,.discovery-grid,.memory-list").forEach((deck,i)=>{deck.id="deck-"+i;layoutDeck(deck);});
}
function renderJourney() {
  const next = nextMission(save),
    count = Object.keys(save.completed).length,
    all = count === 12;
  $("#page").innerHTML =
    `<section class="journey-page"><div class="page-heading"><div><span class="overline">YOUR APPRENTICESHIP</span><h1>${all ? "A world made a little brighter." : "Your apprenticeship"}</h1><p>${all ? "Your story is complete. Revisit your favorite moments, perfect your seals, or make something entirely your own." : "Three chapters. Twelve moments of magic."}</p></div><div class="journey-count"><b>${String(count).padStart(2, "0")}<i>/12</i></b><span>MOMENTS OF MAGIC</span></div></div><div class="chapter-grid">${CHAPTERS.map(
      (c, ci) => {
        const chapterMissions = MISSIONS.map((m, i) => ({
            ...m,
            index: i,
          })).filter((m) => m.chapter === ci),
          unlocked = available(chapterMissions[0].index, save),
          complete = chapterMissions.filter((m) => save.completed[m.id]).length;
        return `<article class="chapter-card ${unlocked ? "" : "locked"}"><div class="chapter-art art-${c.art}"><div class="chapter-badge">${c.subtitle} <span>${complete}/4</span></div><div class="chapter-art-copy"><span>${c.place}</span><h2>${c.name}</h2></div></div><div class="chapter-description">${escape(c.description)}</div><div class="mission-list">${chapterMissions
          .map((m) => {
            const done = save.completed[m.id],
              open = available(m.index, save);
            return `<button class="mission-row ${m.index === next && !all ? "next" : ""}" data-act="mission" data-index="${m.index}" ${open ? "" : "disabled"}><span class="mission-number">${done ? "✓" : open ? String(m.index + 1).padStart(2, "0") : "·"}</span><span><b>${m.title}</b><small>${m.location}</small></span>${done ? stars(done.stars) : `<span class="mission-arrow">${open ? "↗" : "⌑"}</span>`}</button>`;
          })
          .join(
            "",
          )}</div><div class="chapter-foot">${!unlocked ? "Finish the previous chapter to follow this road." : complete === 4 ? "A chapter to remember." : "There is no hurry. Every line is a lesson."}</div></article>`;
      },
    ).join(
      "",
    )}</div><div class="journey-lower"><div class="studio-invite"><div class="invite-icon">${icon("quill")}</div><div><span class="overline">A PAGE WITH NO INSTRUCTIONS</span><h2>What will your hands discover?</h2><p>Draw freely, invent combinations, and collect your own working seals.</p></div><button class="button outline" data-act="studio">Enter the studio ${icon("arrow")}</button></div><div class="mastery-note"><b>${Object.values(save.completed).reduce((n, m) => n + m.stars, 0)}<span>/ 36</span></b><p>Mastery stars<br><small>Draw without guides for a third star.</small></p></div></div></section>`;
  paginateCollections();
}

function beginMission(index) {
  if (!available(index, save)) return;
  cleanup();
  page = "mission";
  missionIndex = index;
  stepIndex = 0;
  scores = [];
  usedGuide = false;
  assisted = index < 4;
  lastResult = null;
  save.lastMission = index;
  persist();
  $$("[data-page]").forEach((b) =>
    b.classList.toggle("active", b.dataset.page === "journey"),
  );
  renderMission();
  const m = MISSIONS[index];
  openDialog(
    `<div class="story-intro art-${CHAPTERS[m.chapter].art}"><span>${CHAPTERS[m.chapter].subtitle} · MOMENT ${String(index + 1).padStart(2, "0")}</span></div><div class="dialog-content"><span class="overline">${m.location}</span><h2>${m.title}</h2><blockquote>“${m.before.text}”</blockquote><div class="speaker"><span>Q</span><div>${m.before.speaker}<small>${m.before.speaker === "Qifrey" ? "Your teacher" : "A voice along the road"}</small></div></div><button class="button dark wide" data-act="begin-drawing">Take out your pen ${icon("quill")}</button></div>`,
  );
}
function requirement() {
  return MISSIONS[missionIndex].steps[stepIndex];
}
function targetMarkup(type) {
  return `<div class="world-object" id="worldObject" data-object="${type}">${objectArt(type)}</div><button class="target-label" data-act="inspect">${icon("spark")}<span>${OBJECT_NAMES[type]}<small>YOUR SPELL’S FOCUS</small></span></button>`;
}
function sceneMarkup({ art, location, title, brief, type, studio = false }) {
  return `<div class="stage-scene art-${art}" id="stageScene"><div class="scene-shade"></div><canvas class="effects-canvas" id="effects" aria-hidden="true"></canvas><div class="scene-location"><span class="location-dot"></span>${location}<span class="scene-time">${art === "forest" ? "BLUE HOUR" : "LATE AFTERNOON"}</span></div><div class="scene-heading"><span class="overline">${studio ? "THE DRAWING STUDIO" : `MOMENT ${String(missionIndex + 1).padStart(2, "0")}`}</span><h1>${title}</h1><p>${brief}</p></div>${targetMarkup(type)}<div class="scene-caption"><span>✦</span><p id="sceneCaption">${studio ? "No instructions. No wrong turns. Just ink and possibility." : "The world is waiting for a little magic."}</p></div>${studio ? `<div class="scene-selector" aria-label="Practice environment">${["atelier", "village", "forest"].map((a) => `<button data-act="environment" data-environment="${a}" class="${a === studioScene ? "active" : ""}">${a === "atelier" ? "Atelier" : a === "village" ? "Village" : "Observatory"}</button>`).join("")}</div>` : ""}</div>`;
}
function deskMarkup(studio = false) {
  const r = studio ? studioRecipe : requirement();
  return `<section class="spell-desk" aria-label="Spell drawing desk"><div class="desk-header"><span>${icon("quill")} DRAWING ATELIER</span><div class="desk-utilities"><button class="text-button music-toggle" data-act="music" aria-pressed="${save.settings.music}" aria-label="Toggle background music">${save.settings.music ? "♫ On" : "♫ Off"}</button><button class="text-button" data-act="focus-desk">Expand ↗</button><button class="text-button" data-act="field-guide">Spellbook ↗</button></div></div><div class="spell-order"><div><span class="overline">${studio ? "YOUR OWN SPELL" : `SEAL ${stepIndex + 1} OF ${MISSIONS[missionIndex].steps.length}`}</span><h2 id="orderTitle">${studio ? "Your spell. Your ink." : ELEMENTS[r.element].name + " · " + MODIFIERS[r.modifier].name}</h2></div><span class="order-element" id="orderElement">${svgPaths(heart(r.element),"-.65 -.65 1.3 1.3")}</span></div>${studio ? `<p class="desk-instruction">Sigil. Signs. Close the ring.</p><div class="studio-hints"><button data-act="recipe" class="recipe-select">Reference: <span id="recipeLabel">${ELEMENTS[r.element].name} / ${MODIFIERS[r.modifier].name}</span> <span>⌄</span></button><button class="icon-button" data-act="download-seal" aria-label="Download drawing as PNG">↓</button></div>` : `<p class="desk-instruction" id="deskInstruction">${recipeInstruction(r)}</p><div class="step-track">${MISSIONS[missionIndex].steps.map((s, i) => `<span class="${i < stepIndex ? "complete" : i === stepIndex ? "current" : ""}">${i < stepIndex ? "✓" : i + 1}<small>${ELEMENTS[s.element].name}</small></span>`).join("")}</div>`}${studio ? `<div class="study-strip" aria-label="Sigil references">${Object.entries(ELEMENTS).filter(([id])=>["fire","water","earth","wind","light"].includes(id)).map(([id,e])=>`<button data-act="study-sigil" data-element="${id}" title="Study ${e.name}">${svgPaths(heart(id),"-.65 -.65 1.3 1.3")}<span>${e.name}</span></button>`).join("")}</div>` : ""}<div class="canvas-slot"><div class="drawing-surface"><div class="paper-ornament top-left"></div><div class="paper-ornament top-right"></div><canvas class="desk-effects" id="deskEffects" aria-hidden="true"></canvas><canvas id="drawing" aria-label="Draw your spell here using a pen, finger, or mouse. The ring can be drawn anywhere on this page."></canvas><div class="paper-ornament bottom-left"></div><div class="paper-ornament bottom-right"></div><span class="paper-watermark">INK IS ONLY THE BEGINNING</span></div></div><div class="desk-tools"><div class="tool-group"><button class="tool active" data-act="pen" title="Pen (P)" aria-label="Ink pen" aria-pressed="true">${icon("quill")}</button><button class="tool" data-act="erase" title="Stroke eraser (E)" aria-label="Eraser" aria-pressed="false">${icon("eraser")}</button><span class="tool-divider"></span><button class="tool" data-act="undo" title="Undo (Ctrl Z)" aria-label="Undo">${icon("undo")}</button><button class="tool redo" data-act="redo" title="Redo (Ctrl Shift Z)" aria-label="Redo">${icon("undo")}</button><button class="tool" data-act="clear" title="New page" aria-label="Clear drawing">${icon("trash")}</button></div><label class="check-label"><input type="checkbox" id="traceGuide" ${studio ? (studioGuide ? "checked" : "") : assisted ? "checked" : ""}> Trace guide</label></div><div class="pen-status"><span class="status-dot"></span><span id="penStatus">${save.settings.penOnly ? "Pen-only input · palm rejection" : "Pen, touch, or mouse · ready"}</span><span id="strokeCount">0 lines</span></div><div class="spell-feedback" id="spellFeedback" role="status" aria-live="polite"><span class="feedback-icon">✧</span><span id="feedbackText">${studio ? "Draw freely. Close the ring to cast." : "Sigil → signs → close the ring."}</span></div><div class="cast-actions"><button class="button dark cast-button" id="castButton" data-act="cast">Awaken spell ${icon("spark")}</button><button class="save-seal-button" data-act="save-seal" aria-label="Save drawing to grimoire" title="Save this drawing">${icon("book")}</button></div><button id="nextSeal" class="button gold wide hidden" data-act="next-seal">Draw the next seal ${icon("arrow")}</button><div class="desk-bottom"><span>PRESSURE-SENSITIVE INK</span><span>${save.settings.autoCast ? "CLOSE RING TO CAST" : "TAP AWAKEN TO CAST"}</span></div></section>`;
}
function recipeInstruction(r) {
  return `Draw the ${ELEMENTS[r.element].name.toLowerCase()} sigil with <b>${r.signs} ${MODIFIERS[r.modifier].name.toLowerCase()} sign${r.signs > 1 ? "s" : ""}</b>, then finish with one closed ring.`;
}
function mountDesk(studio = false) {
  desk = new DrawingDesk($("#drawing"), {
    settings: save.settings,
    onChange: (message, pointer) => {
      if (message) setFeedback(message, "warning");
      if (pointer && page === "mission" && assisted) usedGuide = true;
      if (pointer)
        $("#penStatus").textContent =
          pointer === "pen"
            ? "Pen connected · pressure-sensitive ink"
            : `${pointer === "touch" ? "Touch" : "Mouse"} input · drawing`;
      $("#strokeCount").textContent = `${desk?.strokes.length || 0} lines`;
      if (lastResult) lastResult = null;
    },
    onFinish: (last) => {
      if (busy || stageFinished) return;
      const r = page === "studio" ? compileSpell(desk.strokes, {interpretations:save.settings.interpretations}) : recognize(desk.strokes);
      if (r.ok) setFeedback(`${ELEMENTS[r.element].name} sigil · ${r.composition.map(id=>MODIFIERS[id].name).join(" + ") || "no shaping signs"} · ${r.signs} signs. ${save.settings.autoCast ? "Seal is ready." : "Tap Awaken when ready."}`, "ready");
      else if (desk.strokes.length>1) setFeedback(r.reason);
      if (save.settings.autoCast && r.ok && last.some(p=>Math.abs(Math.hypot(p.x-r.ring.x,p.y-r.ring.y)-r.ring.r)<r.ring.r*0.2)) castSpell();
    },
  });
  desk.setGuide(
    studio
      ? studioGuide
        ? studioRecipe
        : null
      : assisted
        ? requirement()
        : null,
  );
  if (studio && studioStrokes.length) desk.load(studioStrokes);
  effects = new WorldEffects($("#deskEffects"), save.settings.reducedMotion);
}
function renderMission() {
  window.scrollTo({ top: 0, behavior: "instant" });
  const m = MISSIONS[missionIndex],
    c = CHAPTERS[m.chapter];
  $("#page").innerHTML =
    `<div class="encounter-bar"><button class="text-button" data-act="journey">← Journey</button><span>${c.subtitle} <i>/</i> ${m.location}</span><button class="text-button" data-act="dialogue">Hear the introduction</button></div><section class="play-layout">${sceneMarkup({ art: c.art, location: c.place, title: m.title, brief: m.brief, type: m.object })}${deskMarkup()}</section>`;
  mountDesk();
}
function renderStudio() {
  $("#page").innerHTML =
    `<div class="encounter-bar"><button class="text-button" data-act="journey">← Journey</button><span>THE STUDIO <i>/</i> AN UNWRITTEN PAGE</span><button class="text-button" data-act="field-guide">How drawn magic works ↗</button></div><section class="play-layout studio-layout">${sceneMarkup({ art: studioScene, location: studioScene === "atelier" ? "The quiet atelier" : studioScene === "village" ? "The village at rest" : "The open observatory", title: "A little ink.<br>Unlimited possibility.", brief: "Draw from memory. Try a new arrangement. Give an old spell a different intention.", type: "lantern", studio: true })}${deskMarkup(true)}</section>`;
  lastResult = null;
  mountDesk(true);
}
function setFeedback(text, kind = "neutral") {
  const e = $("#spellFeedback");
  if (!e) return;
  e.className = "spell-feedback " + kind;
  $("#feedbackText").textContent = text;
}
function castSpell() {
  if (!desk || desk.active || busy || stageFinished) return;
  const r = page === "studio" ? compileSpell(desk.strokes, {interpretations:save.settings.interpretations}) : recognize(desk.strokes);
  lastResult = r;
  if (!r.ok) {
    setFeedback(r.reason, "warning");
    sound("miss");
    return;
  }
  if (page === "studio" && r.executable === false) {
    setFeedback(r.warnings[0] || "Study symbol recognised; effect unresolved.", "warning");
    $("#sceneCaption").textContent = r.summary + " · study only";
    return;
  }
  const element = ELEMENTS[r.element];
  $("#stageScene").style.setProperty("--spell-color", element.color);
  effects.cast(r);
  $("#stageScene").classList.remove("casting");
  void $("#stageScene").offsetWidth;
  $("#stageScene").classList.add("casting");
  sound(r.element);
  discover(r);
  if (page === "studio") {
    const objectType = {
      light: "lantern",
      water: "plant",
      wind: "paper",
      fire: "kettle",
      earth: "arch",
    }[r.element] || "observatory";
    $("#worldObject").innerHTML = objectArt(objectType);
    $("#worldObject").dataset.object = objectType;
    $(".target-label>span").innerHTML =
      `${OBJECT_NAMES[objectType]}<small>YOUR SPELL’S FOCUS</small>`;
    $("#worldObject").className = "world-object awakened " + r.modifier;
    $("#worldObject").dataset.element = r.element;
    $("#sceneCaption").textContent =
      `${r.summary || element.name} · ${r.layers?.length || 1} seal${r.layers?.length===1?"":"s"} · ${r.signs} signs`;
    setFeedback(
      `${r.summary || element.name} · ${r.quality}% clarity. Save to your grimoire.`,
      "success",
    );
    $("#orderElement").innerHTML = svgPaths(heart(r.element),"-.65 -.65 1.3 1.3");
    return;
  }
  const objective = checkObjective(r, requirement());
  if (!objective.ok) {
    setFeedback(objective.reason, "warning");
    $("#sceneCaption").textContent =
      "Magic answered, but the task needs a different intention.";
    return;
  }
  usedGuide = usedGuide || assisted;
  scores.push(r.quality);
  busy = true;
  $("#castButton").disabled = true;
  $("#worldObject").className = "world-object awakened " + r.modifier;
  $("#worldObject").dataset.element = r.element;
  $("#stageScene").dataset.completedSteps = String(stepIndex + 1);
  $$("#worldObject .channel").forEach((channel, index) =>
    channel.classList.toggle("filled", index <= stepIndex),
  );
  $("#sceneCaption").textContent =
    stepIndex === MISSIONS[missionIndex].steps.length - 1
      ? MISSIONS[missionIndex].after
      : "The first part of your intention settles into the world.";
  setFeedback(
    `${element.name} awakened · ${r.quality}% clarity. ${stepIndex < MISSIONS[missionIndex].steps.length - 1 ? "The next seal is ready when you are." : "A small wonder, made by your hands."}`,
    "success",
  );
  if (stepIndex < MISSIONS[missionIndex].steps.length - 1) {
    $("#nextSeal").classList.remove("hidden");
    $("#castButton").parentElement.classList.add("hidden");
    busy = false;
  } else {
    stageFinished = true;
    const reward = completeMission(save, missionIndex, scores, usedGuide);
    lastReward = reward;
    persist();
    $("#nextSeal").classList.remove("hidden");
    $("#nextSeal").dataset.act = "show-result";
    $("#nextSeal").innerHTML = `Read this moment ${icon("book")}`;
    $("#castButton").parentElement.classList.add("hidden");
    later(
      () => showCompletion(reward),
      save.settings.reducedMotion ? 200 : 1600,
    );
  }
}
function discover(r) {
  const key = r.element + "-" + r.modifier;
  if (!save.discoveries.includes(key)) {
    save.discoveries.push(key);
    persist();
    toast(
      `New discovery · ${ELEMENTS[r.element].name} × ${MODIFIERS[r.modifier].name}`,
    );
  }
}
function nextSeal() {
  if (!desk || stepIndex >= MISSIONS[missionIndex].steps.length - 1) return;
  stepIndex++;
  busy = false;
  lastResult = null;
  desk.clear();
  $("#orderTitle").textContent =
    ELEMENTS[requirement().element].name +
    " · " +
    MODIFIERS[requirement().modifier].name;
  $("#orderElement").innerHTML = svgPaths(heart(requirement().element),"-.65 -.65 1.3 1.3");
  $(".spell-order .overline").textContent =
    `SEAL ${stepIndex + 1} OF ${MISSIONS[missionIndex].steps.length}`;
  $("#deskInstruction").innerHTML = recipeInstruction(requirement());
  $$(".step-track>span").forEach((el, i) => {
    el.className =
      i < stepIndex ? "complete" : i === stepIndex ? "current" : "";
    el.innerHTML = `${i < stepIndex ? "✓" : i + 1}<small>${ELEMENTS[MISSIONS[missionIndex].steps[i].element].name}</small>`;
  });
  desk.setGuide(assisted ? requirement() : null);
  $("#nextSeal").classList.add("hidden");
  $("#castButton").parentElement.classList.remove("hidden");
  $("#castButton").disabled = false;
  setFeedback("Fresh parchment. Let the next spell complete your intention.");
}
function showCompletion(reward) {
  const m = MISSIONS[missionIndex],
    chapterEnd = missionIndex % 4 === 3,
    final = missionIndex === 11;
  openDialog(
    `<div class="completion-seal">${icon("spark")}</div><div class="dialog-content completion"><span class="overline">${final ? "YOUR STORY, WRITTEN IN INK" : chapterEnd ? "A CHAPTER TO REMEMBER" : "A MOMENT OF MAGIC"}</span><h2>${final ? "The sky we make." : m.title}</h2>${stars(reward.stars)}<p>${m.after}</p><div class="reward-line"><span>KEEPSAKE EARNED</span><b>✧ ${m.reward}</b></div><div class="result-stats"><span><b>${reward.quality}%</b>Seal clarity</span><span><b>${reward.isNew ? 80 + reward.stars * 20 : 0}</b>Insight gained</span><span><b>${usedGuide ? "Guided" : "From memory"}</b>Your craft</span></div>${reward.stars < 3 ? '<p class="mastery-tip">For three stars, revisit this moment without the trace guide and reach 85% clarity.</p>' : ""}<div class="dialog-actions"><button class="button dark" data-act="${final ? "ending" : "mission"}" ${final ? "" : `data-index="${missionIndex + 1}"`}>${final ? "Read your epilogue" : chapterEnd ? "Follow the road" : "The next moment"} ${icon("arrow")}</button><button class="button light" data-act="journey">Return to journey</button></div></div>`,
  );
}
function ending() {
  closeDialog();
  openDialog(
    `<div class="story-intro ending-art art-forest"></div><div class="dialog-content"><span class="overline">EPILOGUE · THE NEXT EMPTY PAGE</span><h2>Wonder is a practice.</h2><p>The road home is the same road. The village is the same village. Yet the little things look different now: the rain caught on a leaf, the wind in a mill’s sails, the light in someone’s window.</p><p>You know what your hands can do. More than that, you know why they might do it.</p><blockquote>“There will always be another blank page.”</blockquote><p class="epilogue-signature">Thank you for making a little wonder.</p><div class="dialog-actions"><button class="button dark" data-act="studio">Write your own spells ${icon("quill")}</button><button class="button light" data-act="journey">Revisit the journey</button></div><small class="fan-note">An original unofficial fan story inspired by Witch Hat Atelier. Story dialogue, locations outside the atelier, and practice seals are game adaptations.</small></div>`,
  );
}
function recipePlan() {
 return {element:$("#recipeElement").value,modifier:$("#recipeModifier").value,signs:Number($("#recipeSigns").value),extraSigils:$("#recipeExtra").value?[$("#recipeExtra").value]:[],extraSigns:$("#recipeSignExtra").value?[$("#recipeSignExtra").value]:[],structure:$("#recipeStructure").value,inverted:$("#recipeInverted").checked};
}
function openRecipe() {
 const options=(records,current,empty=false)=>(empty?'<option value="">None</option>':"")+Object.values(records).filter(g=>g.paths.length).map(g=>`<option value="${g.key}" ${g.key===current?"selected":""}>${g.name}</option>`).join("");
 openDialog(`<div class="dialog-content composer"><span class="overline">REFERENCE ONLY · YOUR INK DECIDES</span><h2>Compose a seal</h2><div class="composer-layout"><div class="composer-fields"><label class="form-label">Sigil<select id="recipeElement">${options(SIGILS,studioRecipe.element)}</select></label><label class="form-label">Second sigil<select id="recipeExtra">${options(SIGILS,studioRecipe.extraSigils?.[0],true)}</select></label><label class="form-label">Sign<select id="recipeModifier">${options(SIGNS,studioRecipe.modifier)}</select></label><label class="form-label">Second sign<select id="recipeSignExtra">${options(SIGNS,studioRecipe.extraSigns?.[0],true)}</select></label><label class="form-label">Signs<select id="recipeSigns">${[0,1,2,3,4,5,6,8,12].map(n=>`<option ${n===studioRecipe.signs?"selected":""}>${n}</option>`).join("")}</select></label><label class="form-label">Arrangement<select id="recipeStructure">${["single","nested","parallel"].map(k=>`<option ${studioRecipe.structure===k?"selected":""}>${k}</option>`).join("")}</select></label><label class="check-label"><input id="recipeInverted" type="checkbox" ${studioRecipe.inverted?"checked":""}> Invert signs</label></div><div id="recipePreview" class="recipe-preview">${svgPaths(compositionPaths(studioRecipe),"0 0 600 600")}</div></div><button class="button dark wide" data-act="apply-recipe">Use reference</button></div>`);
}
function applyRecipe() {
 studioRecipe=recipePlan();
 $("#recipeLabel").textContent=ELEMENTS[studioRecipe.element].name+" / "+MODIFIERS[studioRecipe.modifier].name;
 desk.setGuide(studioGuide?studioRecipe:null);closeDialog();
}
function saveSeal() {
  if (!desk?.strokes.length) {
    toast("Put a little ink on the page first.");
    return;
  }
  if (save.seals.length >= 40) {
    toast(
      "Your grimoire holds 40 pages. Export your save or remove a page to make room.",
    );
    return;
  }
  const r = page === "studio" ? compileSpell(desk.strokes, {interpretations:save.settings.interpretations}) : recognize(desk.strokes);
  openDialog(
    `<div class="dialog-content"><span class="overline">A PAGE FOR YOUR GRIMOIRE</span><h2>Give your idea a name.</h2><p>${r.ok ? `${ELEMENTS[r.element].name} · ${MODIFIERS[r.modifier].name} · ${r.quality}% clarity` : "An experimental sketch. You can keep drawings even before they awaken."}</p><label class="form-label">Seal name<input id="sealName" maxlength="60" value="${r.ok ? ELEMENTS[r.element].name + " of " + ["the quiet morning", "the open road", "the silver sky"][Math.floor(Math.random() * 3)] : "An unfinished possibility"}" autocomplete="off"></label><button class="button dark wide" data-act="confirm-save-seal">Place in grimoire ${icon("book")}</button></div>`,
  );
  $("#sealName").focus();
  $("#sealName").select();
}
function confirmSaveSeal() {
  const name = $("#sealName").value.trim();
  if (!name) {
    $("#sealName").focus();
    return;
  }
  const r = page === "studio" ? compileSpell(desk.strokes, {interpretations:save.settings.interpretations}) : recognize(desk.strokes);
  save.seals.unshift({
    id: crypto.randomUUID(),
    name,
    element: r.ok ? r.element : "sketch",
    modifier: r.ok ? r.modifier : "focus",
    quality: r.ok ? r.quality : 0,
    strokes: structuredClone(desk.strokes),
  });
  persist();
  closeDialog();
  toast("A new page has been placed in your grimoire.");
}
function fieldGuide() {
  const entries=CATALOGUE.filter(g=>(atlasKind==="all"||g.kind===atlasKind)&&g.name.toLowerCase().includes(atlasQuery.toLowerCase()));
  const atlasSize=(window.innerHeight||720)<620?4:6;
  const total=Math.max(1,Math.ceil(entries.length/atlasSize));guidePage=Math.max(0,Math.min(total-1,guidePage));
  openDialog(`<div class="dialog-content atlas"><span class="overline">THE DRAWN LANGUAGE · 83 REFERENCES</span><div class="atlas-heading"><h2>Spell atlas</h2><button class="text-button" data-act="seal-basics">How to draw ↗</button></div><div class="atlas-filters"><input id="atlasSearch" type="search" value="${escape(atlasQuery)}" placeholder="Find a symbol" aria-label="Find a symbol"><select id="atlasKind" aria-label="Symbol type">${["all","sigil","sign"].map(k=>`<option value="${k}" ${k===atlasKind?"selected":""}>${k==="all"?"All symbols":k==="sigil"?"Sigils":"Signs"}</option>`).join("")}</select></div><div class="atlas-grid">${entries.slice(guidePage*atlasSize,guidePage*atlasSize+atlasSize).map(g=>`<article class="atlas-card"><button class="atlas-glyph" data-act="atlas-detail" data-id="${g.id}" aria-label="Inspect ${escape(g.name)}">${g.paths.length?svgPaths(g.paths,"-.65 -.65 1.3 1.3"):'<span>?</span>'}</button><div><h3>${escape(g.name)}</h3><span class="certainty">${g.kind} · ${g.certainty==="observed"?"documented":g.certainty==="inferred"?"interpretation":g.certainty==="unrecorded"?"design unpublished":"effect unknown"}</span><p>${escape(g.effect||"Study reference; no invented effect.")}</p><a href="${g.source}" target="_blank" rel="noopener noreferrer">Reference ↗</a>${g.paths.length?`<button class="text-button" data-act="atlas-use" data-id="${g.id}">Study ↗</button>`:""}</div></article>`).join("")||'<p>No symbols found.</p>'}</div><div class="book-turns"><button class="button light" data-act="guide-page" data-index="${guidePage-1}" ${guidePage===0?"disabled":""}>←</button><span>${guidePage+1} / ${total}</span><button class="button dark" data-act="guide-page" data-index="${guidePage+1}" ${guidePage===total-1?"disabled":""}>→</button></div><p class="atlas-note">Sigil → signs → close the ring. Effects are game approximations. <a href="assets/glyph-attribution.md" target="_blank" rel="noopener">Sources & credits ↗</a></p></div>`);
}
function renderGrimoire() {
  $("#page").innerHTML =
    `<section class="grimoire-page"><div class="page-heading"><div><span class="overline">THE THINGS YOUR HANDS REMEMBER</span><h1>Your personal grimoire.</h1><p>Your spells and keepsakes.</p></div><div class="book-emblem">${icon("book")}</div></div><div class="book-tabs">${[
      ["seals", "My seals", save.seals.length],
      ["discoveries", "Discoveries", save.discoveries.length + "/12"],
      ["memories", "Memories", Object.keys(save.completed).length + "/12"],
    ]
      .map(
        ([id, label, count]) =>
          `<button class="${bookTab === id ? "active" : ""}" data-act="book-tab" data-tab="${id}">${label}<span>${count}</span></button>`,
      )
      .join(
        "",
      )}<button data-act="field-guide" class="book-guide">Field guide ↗</button></div><div class="book-content">${bookTab === "seals" ? sealsMarkup() : bookTab === "discoveries" ? discoveriesMarkup() : memoriesMarkup()}</div></section>`;
  paginateCollections();
}

function sealsMarkup() {
  if (!save.seals.length)
    return `<div class="empty-book"><span>✧</span><h2>Your next idea belongs here.</h2><p>Save a working spell or an experimental sketch from the drawing desk.<br>This grimoire is yours to fill.</p><button class="button dark" data-act="studio">Find a blank page ${icon("quill")}</button></div>`;
  return `<div class="seal-grid">${save.seals.map((s, i) => `<article class="saved-seal"><div class="saved-seal-art">${svgPaths(s.strokes, "0 0 600 600")}</div><span class="overline">${s.element === "sketch" ? "EXPERIMENTAL PAGE" : ELEMENTS[s.element].name + " / " + MODIFIERS[s.modifier].name}</span><h2>${escape(s.name)}</h2><p>${s.quality ? s.quality + "% clarity" : "An idea still taking shape"}</p><div><button class="text-button" data-act="open-seal" data-index="${i}">Open in studio ↗</button><button class="text-button remove-page" data-act="remove-seal" data-index="${i}" aria-label="Remove ${escape(s.name)}">×</button></div></article>`).join("")}</div>`;
}
function discoveriesMarkup() {
  return `<div class="discovery-grid">${Object.entries(ELEMENTS).filter(([key])=>["fire","water","wind","earth","light"].includes(key)||save.discoveries.some(d=>d.startsWith(key+"-")))
    .flatMap(([element, e]) =>
      Object.entries(MODIFIERS).filter(([key])=>["focus","flow","spread"].includes(key)||save.discoveries.includes(element+"-"+key)).map(([modifier, m]) => {
        const found = save.discoveries.includes(element + "-" + modifier);
        return `<article class="discovery ${found ? "found" : ""}"><div>${found ? svgPaths(recipePaths(element, modifier, 3)) : '<span class="unknown">?</span>'}</div><span class="overline">${found ? "DISCOVERED" : "UNEXPLORED"}</span><h2>${e.name} × ${m.name}</h2><p>${found ? m.description : "Try this combination in the free drawing studio."}</p><button class="text-button" data-act="try-combination" data-element="${element}" data-modifier="${modifier}">${found ? "Draw again" : "Experiment"} ↗</button></article>`;
      }),
    )
    .join("")}</div>`;
}
function memoriesMarkup() {
  return `<div class="memory-list">${MISSIONS.map((m, i) => {
    const done = save.completed[m.id];
    return `<article class="memory ${done ? "" : "unwritten"}"><span class="memory-number">${String(i + 1).padStart(2, "0")}</span><div><span class="overline">${CHAPTERS[m.chapter].subtitle} · ${done ? m.reward : "AN UNWRITTEN MOMENT"}</span><h2>${m.title}</h2><p>${done ? m.memory : "Follow the road to find out what this page will hold."}</p></div>${done ? stars(done.stars) : '<span class="memory-lock">◇</span>'}</article>`;
  }).join("")}</div>`;
}
function settings() {
  openDialog(
    `<div class="dialog-content"><span class="overline">MAKE YOURSELF AT HOME</span><h2>Your atelier, your pace.</h2><div class="settings-list">${[
      ["music", "Background music", "A quiet original melody and soft sustained chords. Pauses when this tab is hidden."],
      ["sound", "Spell sounds", "Original soft chimes when a spell awakens."],
      [
        "penOnly",
        "Pen only",
        "Reject fingers and palms on the drawing page. Turn off for touch-only styluses.",
      ],
      [
        "autoCast",
        "Awaken on ring closure",
        "A readable seal casts when you finish its enclosing ring.",
      ],
      [
        "reducedMotion",
        "Reduce motion",
        "Gentler effects and no animated world objects.",
      ],
      ["largeText", "Larger text", "Larger instructions."],
      ["interpretations", "Interpret uncertain effects", "Optional game interpretations; off for strict study."],
    ]
      .map(
        ([id, label, description]) =>
          `<label class="setting-row"><span><b>${label}</b><small>${description}</small></span><input type="checkbox" data-setting="${id}" ${save.settings[id] ? "checked" : ""}></label>`,
      )
      .join(
        "",
      )}</div><div class="data-settings"><span class="overline">KEEP YOUR STORY SAFE</span><p>Your saves stay private.</p><div class="dialog-actions"><button class="button light" data-act="export">Export save ↓</button><button class="button light" data-act="import">Import save ↑</button></div></div><button class="button light wide install-button" data-act="install">Install on your tablet ↗</button><button class="button dark wide" data-act="close-dialog">Back to the story</button><p class="fan-note">Original fan story, art, and practice seals inspired by Witch Hat Atelier. No account or network is needed to play after the first load.</p></div>`,
  );
}
function exportSave() {
  const blob = new Blob([JSON.stringify(save, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "ink-and-wonder-save.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Your story has been exported. Keep this file for the move to GitHub.");
}
function sound(type) {
  if (!save.settings.sound) return;
  try {
    audioContext ??= new AudioContext();
    audioContext.resume();
    const notes =
      type === "miss"
        ? [220, 196]
        : type === "water"
          ? [440, 587.33, 880, 1174.66]
          : type === "wind"
            ? [392, 523.25, 783.99, 1046.5]
            : type === "fire"
              ? [329.63, 440, 659.25, 880]
              : [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const o = audioContext.createOscillator(),
        g = audioContext.createGain(),
        at = audioContext.currentTime + i * 0.1;
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(
        type === "miss" ? 0.012 : 0.035,
        at + 0.015,
      );
      g.gain.exponentialRampToValueAtTime(0.0001, at + 1.9);
      o.connect(g).connect(audioContext.destination);
      o.start(at);
      o.stop(at + 2);
    });
  } catch {}
}
function setTool(tool) {
  desk?.setTool(tool);
  $$('[data-act="pen"],[data-act="erase"]').forEach((b) => {
    const selected = b.dataset.act === (tool === "erase" ? "erase" : "pen");
    b.classList.toggle("active", selected);
    b.setAttribute("aria-pressed", String(selected));
  });
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-act]");
  if (!button || button.disabled) return;
  const act = button.dataset.act;
  if (["journey", "studio", "grimoire", "mission", "ending"].includes(act))
    closeDialog();
  if (act === "journey" || act === "studio" || act === "grimoire")
    navigate(act);
  else if (act === "mission") beginMission(Number(button.dataset.index));
  else if (act === "begin-drawing") closeDialog();
  else if (act === "close-dialog") closeDialog();
  else if (act === "music") {
    save.settings.music=!save.settings.music; music.sync(); persist();
    button.textContent=save.settings.music?"♫ On":"♫ Off";
    button.setAttribute("aria-pressed",String(save.settings.music));
  }
  else if (act === "seal-basics") {openDialog(`<div class="dialog-content seal-basics"><span class="overline">THE LANGUAGE OF DRAWN MAGIC</span><h2>Three parts. One intention.</h2><div class="basics-layout"><div>${svgPaths(recipePaths("water","flow",3))}</div><ol><li><b>Sigil</b><p>The element or material.</p></li><li><b>Signs</b><p>Shape, strength and motion.</p></li><li><b>Enclosing ring</b><p>Close it last to awaken the seal.</p></li></ol></div><p>Size and balance matter. Combine sigils or nest rings to experiment.</p><p class="atlas-note">Based on the volume 1 casting-seal introduction. Recognition and effects are game approximations.</p><button class="button dark wide" data-act="field-guide">Explore the atlas</button></div>`);}
  else if (act === "atlas-detail") {const g=CATALOGUE.find(g=>g.id===button.dataset.id);openDialog(`<div class="dialog-content glyph-detail"><span class="overline">${g.kind} · ${g.nameStatus==="community"?"community name":"reference name"}</span><h2>${escape(g.name)}</h2><div class="detail-glyph">${g.paths.length?svgPaths(g.paths,"-.65 -.65 1.3 1.3"):"<span>Design unpublished</span>"}</div><p>${g.certainty==="observed"?"Documented symbol. Game effects are approximations.":g.certainty==="inferred"?"Effect interpretation; not confirmed canon.":"Unresolved reference. Study only."}</p><div class="dialog-actions"><button class="button light" data-act="field-guide">← Atlas</button>${g.paths.length?`<button class="button dark" data-act="atlas-use" data-id="${g.id}">Use reference</button>`:""}<a href="${g.source}" target="_blank" rel="noopener noreferrer">Source ↗</a></div></div>`);}
  else if (act === "atlas-use") {const g=CATALOGUE.find(g=>g.id===button.dataset.id);if(g.kind==="sigil")studioRecipe.element=g.key;else studioRecipe.modifier=g.key;if(page!=="studio")navigate("studio");openRecipe();}
  else if (act === "deck-page") {const deck=document.getElementById(button.dataset.deck);deck.dataset.current=button.dataset.index;layoutDeck(deck);}
  else if (act === "guide-page") { guidePage=Number(button.dataset.index); fieldGuide(); }
  else if (act === "study-sigil") { studioRecipe.element=button.dataset.element; openRecipe(); }
  else if (act === "field-guide") {guidePage=0;fieldGuide();}
  else if (act === "dialogue") {
    const m = MISSIONS[missionIndex];
    openDialog(
      `<div class="dialog-content"><span class="overline">${m.before.speaker}</span><h2>${m.title}</h2><blockquote>“${m.before.text}”</blockquote><button class="button dark wide" data-act="close-dialog">Return to your drawing</button></div>`,
    );
  } else if (act === "focus-desk") {
    const expanded = $(".play-layout").classList.toggle("focused");
    button.textContent = expanded ? "Back to scene ↙" : "Expand ↗";
  } else if (act === "cast") castSpell();
  else if (act === "pen" || act === "erase") setTool(act);
  else if (act === "undo" || act === "redo") desk?.[act]();
  else if (act === "clear") {
    desk?.clear();
    lastResult = null;
    setFeedback("A fresh page. Every attempt teaches your hand something.");
  } else if (act === "next-seal") nextSeal();
  else if (act === "show-result" && lastReward) showCompletion(lastReward);
  else if (act === "save-seal") saveSeal();
  else if (act === "confirm-save-seal") confirmSaveSeal();
  else if (act === "recipe") openRecipe();
  else if (act === "apply-recipe") applyRecipe();
  else if (act === "download-seal") desk?.download();
  else if (act === "ending") ending();
  else if (act === "environment") {
    studioScene = button.dataset.environment;
    navigate("studio");
  } else if (act === "book-tab") {
    bookTab = button.dataset.tab;
    renderGrimoire();
  } else if (act === "open-seal") {
    const s = save.seals[Number(button.dataset.index)];
    if (!s) return;
    studioStrokes = structuredClone(s.strokes);
    if (s.element !== "sketch")
      studioRecipe = {
        element: s.element,
        modifier: s.modifier,
        signs: recognize(s.strokes).signs || 1,
      };
    navigate("studio");
  } else if (act === "remove-seal") {
    const index = Number(button.dataset.index),
      s = save.seals[index];
    openDialog(
      `<div class="dialog-content"><span class="overline">A PAGE FROM YOUR GRIMOIRE</span><h2>Remove this page?</h2><p>“${escape(s.name)}” will be removed from this browser’s grimoire. Export your save first if you want to keep a copy.</p><div class="dialog-actions"><button class="button dark" data-act="confirm-remove" data-index="${index}">Remove page</button><button class="button light" data-act="close-dialog">Keep it</button></div></div>`,
    );
  } else if (act === "confirm-remove") {
    save.seals.splice(Number(button.dataset.index), 1);
    persist();
    closeDialog();
    renderGrimoire();
  } else if (act === "try-combination") {
    studioRecipe = {
      element: button.dataset.element,
      modifier: button.dataset.modifier,
      signs: 3,
    };
    studioGuide = false;
    navigate("studio");
    openRecipe();
  } else if (act === "install") installGame();
  else if (act === "export") exportSave();
  else if (act === "import") $("#saveImport").click();
  else if (act === "inspect")
    toast(
      page === "studio"
        ? "Your spell will transform this object. Try different elements and signs."
        : MISSIONS[missionIndex].brief,
    );
});
document.addEventListener("change", (e) => {
  if (e.target.id === "traceGuide") {
    if (page === "studio") {
      studioGuide = e.target.checked;
      desk.setGuide(studioGuide ? studioRecipe : null);
    } else {
      assisted = e.target.checked;
      desk.setGuide(assisted ? requirement() : null);
      if (assisted) usedGuide = true;
    }
  }
  if (e.target.dataset.setting) {
    save.settings[e.target.dataset.setting] = e.target.checked;
    if (effects) effects.reduced = save.settings.reducedMotion;
    music.sync();
    document.querySelectorAll(".music-toggle").forEach(b=>{b.textContent=save.settings.music?"♫ On":"♫ Off";b.setAttribute("aria-pressed",String(save.settings.music));});
    persist();
  }
  if (e.target.id.startsWith("recipe") && $("#recipePreview"))
    $("#recipePreview").innerHTML=svgPaths(compositionPaths(recipePlan()),"0 0 600 600");
  if(e.target.id==="atlasSearch"){atlasQuery=e.target.value;guidePage=0;fieldGuide();}
  if(e.target.id==="atlasKind"){atlasKind=e.target.value;guidePage=0;fieldGuide();}

});
$("#saveImport").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 8_000_000) throw Error("This file is too large.");
    const imported = validateSave(JSON.parse(await file.text()));
    openDialog(
      `<div class="dialog-content"><span class="overline">A STORY FROM ANOTHER PAGE</span><h2>Continue this saved story?</h2><p>This save has ${Object.keys(imported.completed).length} completed moments and ${imported.seals.length} grimoire pages. Importing replaces this browser’s current progress.</p><div class="dialog-actions"><button class="button light" data-act="export">Export current story first</button><button class="button dark" id="confirmImport">Import this story</button></div></div>`,
    );
    $("#confirmImport").onclick = () => {
      save = imported;
      cleanup();
      persist();
      closeDialog();
      enter("journey");
      toast("Your story is ready to continue.");
    };
  } catch (error) {
    toast(error.message || "This save could not be read.");
  }
  e.target.value = "";
});
$("#continueGame").onclick = () => enter("journey");
$("#titleWorkshop").onclick = () => enter("studio");
$("#home").onclick = () => {
  cleanup();
  $("#gameScreen").classList.add("hidden");
  $("#titleScreen").classList.remove("hidden");
  updateHeader();
};
$$("[data-page]").forEach((b) => (b.onclick = () => navigate(b.dataset.page)));
$("#settings").onclick = settings;
$("#titleSettings").onclick = settings;
$("#help").onclick = fieldGuide;
$("#closeDialog").onclick = closeDialog;
$("#dialog").addEventListener("click", (e) => {
  if (e.target === $("#dialog")) closeDialog();
});
document.addEventListener("keydown", (e) => {
  if (
    $("#dialog").open ||
    !desk ||
    /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)
  )
    return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    e.shiftKey ? desk.redo() : desk.undo();
  } else if (e.code === "Space") {
    e.preventDefault();
    castSpell();
  } else if (e.key.toLowerCase() === "p") setTool("pen");
  else if (e.key.toLowerCase() === "e") setTool("erase");
});
window.addEventListener("beforeunload", () => {
  if (page === "studio" && desk?.strokes.length) {
    try {
      sessionStorage.setItem(
        localSaveKey + ":draft",
        JSON.stringify(desk.strokes),
      );
    } catch {}
  }
});
updateHeader();
cloud.start();
window.addEventListener("online", () => cloud.sync());
window.addEventListener("focus", () => {
  if (cloud.user) cloud.sync();
});
if (saveError)
  toast("An unreadable save was found. You can import a backup in Settings.");
if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol))
  navigator.serviceWorker.register("./sw.js").catch(() => {});

function installGame() {
  if (installPrompt) {
    installPrompt.prompt();
    installPrompt = null;
    return;
  }
  openDialog(
    `<div class="dialog-content"><span class="overline">YOUR ATELIER, WHEREVER YOU ARE</span><h2>A place on your home screen.</h2><p><b>Android:</b> Open this game in Chrome. In the browser menu, choose Install app or Add to Home screen.</p><p><b>iPad:</b> Open in Safari, tap Share, then Add to Home Screen.</p><p>Once the first load has finished, the game, illustrations, and fonts are available offline. Your saved story stays in this browser. Use Export save when moving to another device or host.</p><button class="button dark wide" data-act="close-dialog">Back to the page</button></div>`,
  );
}

window.addEventListener("resize",()=>{paginateCollections();if($("#dialog").open&&$(".atlas"))fieldGuide();});
