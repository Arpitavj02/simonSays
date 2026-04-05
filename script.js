import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, orderBy,
  limit, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ─── FIREBASE ──────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDuHDaprKkH1XRU1NXvj-NjcJRYFJJu3oU",
  authDomain: "simonsays-8aaf5.firebaseapp.com",
  projectId: "simonsays-8aaf5",
  storageBucket: "simonsays-8aaf5.firebasestorage.app",
  messagingSenderId: "1036250383447",
  appId: "1:1036250383447:web:7f5283c569722cb7ce8f12",
  measurementId: "G-0686JFDM8T"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── SCREENS ───────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const target = document.getElementById(id);
  target.style.display = 'flex';
  // Force reflow then add active
  requestAnimationFrame(() => target.classList.add('active'));
}

// ─── USER ──────────────────────────────────────────────────────────────────
function getUser() {
  return JSON.parse(localStorage.getItem("ss_user") || "null");
}

window.loginUser = function () {
  const name = document.getElementById("login-name").value.trim();
  if (!name) {
    const inp = document.getElementById("login-name");
    inp.focus();
    inp.style.borderColor = "#e85d6a";
    inp.style.boxShadow   = "0 0 0 4px rgba(232,93,106,0.12)";
    setTimeout(() => { inp.style.borderColor = ""; inp.style.boxShadow = ""; }, 1600);
    return;
  }

  let user = getUser();
  user = user
    ? { ...user, name }
    : { id: "u_" + Date.now() + "_" + Math.floor(Math.random() * 99999), name };

  localStorage.setItem("ss_user", JSON.stringify(user));

  // Update game screen
  document.getElementById("player-name-display").textContent = name;
  document.getElementById("avatar-letter").textContent = name[0].toUpperCase();
  document.getElementById("high-score").textContent = localStorage.getItem("highScore") || 0;
  document.getElementById("streak").textContent     = localStorage.getItem("streak")    || 0;

  showScreen("game-screen");
};

window.logoutUser = function () {
  showScreen("login-screen");
  loadLoginStats(); // refresh stats when going back
};

// ─── GAME STATE ────────────────────────────────────────────────────────────
const COLORS  = ["red", "green", "blue", "yellow"];
let gamePattern = [], userPattern = [];
let started = false, accepting = false;
let level = 0, score = 0;
let highScore = parseInt(localStorage.getItem("highScore") || "0");

// ─── SOUND ─────────────────────────────────────────────────────────────────
function playSound(name) {
  const a = new Audio(`sounds/${name}.mp3`);
  a.play().catch(() => {});
}

// ─── START BUTTON ──────────────────────────────────────────────────────────
document.getElementById("start-btn").addEventListener("click", () => {
  if (!started) { updateStreak(); startGame(); }
});

function startGame() {
  level = 0; score = 0; gamePattern = [];
  started = true;
  document.getElementById("score").textContent       = 0;
  document.getElementById("start-btn").disabled      = true;
  document.getElementById("start-btn-text").textContent = "···";
  nextSequence();
}

// ─── NEXT SEQUENCE ─────────────────────────────────────────────────────────
function nextSequence() {
  userPattern = [];
  level++; score++;
  document.getElementById("level-title").textContent = "Level " + level;
  document.getElementById("score").textContent       = score;

  gamePattern.push(COLORS[Math.floor(Math.random() * 4)]);
  playSequence(gamePattern);
}

function playSequence(pattern) {
  accepting = false;
  let i = 0;
  const speed = Math.max(180, 520 - level * 18);

  function next() {
    if (i >= pattern.length) { accepting = true; return; }
    const c = pattern[i++];
    flashBtn(c, false);
    playSound(c);
    setTimeout(next, speed + 120);
  }
  setTimeout(next, 450);
}

// ─── BUTTON CLICKS ─────────────────────────────────────────────────────────
document.querySelectorAll(".qbtn").forEach(btn => {
  btn.addEventListener("click", function () {
    if (!started || !accepting) return;
    const color = this.id;
    userPattern.push(color);
    playSound(color);
    flashBtn(color, true);
    checkAnswer(userPattern.length - 1);
  });
});

// ─── CHECK ─────────────────────────────────────────────────────────────────
function checkAnswer(i) {
  if (userPattern[i] !== gamePattern[i]) { gameOver(); return; }
  if (userPattern.length === gamePattern.length) {
    accepting = false;
    setTimeout(nextSequence, 950);
  }
}

// ─── GAME OVER ─────────────────────────────────────────────────────────────
async function gameOver() {
  accepting = false; started = false;
  playSound("wrong");

  document.body.classList.add("game-over-fx");
  setTimeout(() => document.body.classList.remove("game-over-fx"), 500);

  document.getElementById("start-btn").disabled         = false;
  document.getElementById("start-btn-text").textContent  = "START";
  document.getElementById("level-title").textContent     = "Press START to begin";

  let isNewBest = false;
  if (score > highScore) {
    highScore = score; isNewBest = true;
    localStorage.setItem("highScore", highScore);
    document.getElementById("high-score").textContent = highScore;
  }

  await saveScore(score);
  await buildEndScreen(score, level, isNewBest);
  showScreen("end-screen");
}

// ─── SAVE ──────────────────────────────────────────────────────────────────
async function saveScore(s) {
  const user = getUser(); if (!user) return;
  try {
    const ref  = doc(db, "players", user.id);
    const snap = await getDoc(ref);
    if (!snap.exists() || s > snap.data().score) {
      await setDoc(ref, {
        id: user.id, name: user.name,
        score: s, lastPlayed: new Date().toDateString()
      });
    }
  } catch (e) { console.error("Save:", e); }
}

// ─── END SCREEN ────────────────────────────────────────────────────────────
async function buildEndScreen(s, lv, isNewBest) {
  document.getElementById("end-level").textContent = lv;
  document.getElementById("end-score").textContent = s;
  document.getElementById("end-best").textContent  = highScore;

  const sub = document.getElementById("end-sub");
  sub.innerHTML = `You reached level <b>${lv}</b>`;
  if (isNewBest) {
    sub.innerHTML += `<span class="new-best-badge">🏆 NEW BEST!</span>`;
    document.getElementById("end-emoji").textContent = "🎉";
    document.getElementById("end-title").textContent = "Amazing!";
  } else {
    document.getElementById("end-emoji").textContent = "💥";
    document.getElementById("end-title").textContent = "Game Over";
  }

  try {
    const q    = query(collection(db, "players"), orderBy("score", "desc"), limit(10));
    const snap = await getDocs(q);
    const today = new Date().toDateString();
    const user  = getUser();
    let todayCount = 0, myRank = "—", rank = 1;
    const rows = [];

    snap.forEach(d => {
      const data = d.data();
      if (data.lastPlayed === today) todayCount++;
      rows.push({ ...data, rank });
      if (user && data.id === user.id) myRank = "#" + rank;
      rank++;
    });

    document.getElementById("end-rank").textContent  = myRank;
    document.getElementById("players").textContent   = todayCount;
    document.getElementById("lb-count").textContent  = todayCount + " played today";

    const list = document.getElementById("leaderboard-list");
    list.innerHTML = "";
    rows.forEach(p => {
      const isMe    = user && p.id === user.id;
      const medal   = p.rank === 1 ? "gold" : p.rank === 2 ? "silver" : p.rank === 3 ? "bronze" : "";
      const rankStr = p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : p.rank;
      const palette = ["#e85d6a","#3db87a","#4a90d9","#e8b84b","#9b7fe8","#e8829b","#2dcba4","#e87a3d"];
      const col     = palette[(p.name.charCodeAt(0) || 65) % palette.length];

      list.innerHTML += `
        <div class="lb-row ${isMe ? "me" : ""}">
          <span class="lb-rank ${medal}">${rankStr}</span>
          <div class="lb-avatar" style="background:${col}18;border-color:${col}40;color:${col}">
            ${esc(p.name)[0].toUpperCase()}
          </div>
          <span class="lb-name">${esc(p.name)}${isMe ? `<span style="color:var(--muted2);font-size:11px;margin-left:5px">(you)</span>` : ""}</span>
          <span class="lb-score">${p.score}</span>
        </div>`;
    });

  } catch (e) {
    console.error("LB error:", e);
    document.getElementById("leaderboard-list").innerHTML =
      `<p style="color:var(--muted);font-size:13px;padding:8px 0">Couldn't load leaderboard</p>`;
  }
}

// ─── PLAY AGAIN ────────────────────────────────────────────────────────────
window.playAgain = function () { showScreen("game-screen"); };

// ─── FLASH ─────────────────────────────────────────────────────────────────
function flashBtn(color, isUser) {
  const btn = document.getElementById(color);
  btn.classList.add("pressed");
  setTimeout(() => btn.classList.remove("pressed"), isUser ? 130 : 260);
}

// ─── STREAK ────────────────────────────────────────────────────────────────
function updateStreak() {
  const today     = new Date().toDateString();
  const last      = localStorage.getItem("lastPlayed");
  if (last === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  let streak = parseInt(localStorage.getItem("streak") || "0");
  streak = last === yesterday.toDateString() ? streak + 1 : 1;

  localStorage.setItem("streak", streak);
  localStorage.setItem("lastPlayed", today);
  document.getElementById("streak").textContent = streak;
}

// ─── LOGIN SCREEN STATS ────────────────────────────────────────────────────
async function loadLoginStats() {
  try {
    const today  = new Date().toDateString();
    const allSnap = await getDocs(collection(db, "players"));

    let todayCount = 0, todayTop = 0, allTimeTop = 0;
    const allPlayers = [];

    allSnap.forEach(d => {
      const data = d.data();
      if (data.lastPlayed === today) {
        todayCount++;
        if (data.score > todayTop) todayTop = data.score;
      }
      if (data.score > allTimeTop) allTimeTop = data.score;
      allPlayers.push(data);
    });

    document.getElementById("login-players-today").textContent = todayCount || "0";
    document.getElementById("login-top-score").textContent     = todayTop   || "0";
    document.getElementById("login-all-time").textContent      = allTimeTop || "0";

    // Leaderboard preview — top 5 by score
    allPlayers.sort((a, b) => b.score - a.score);
    const top5   = allPlayers.slice(0, 5);
    const prevEl = document.getElementById("login-lb-preview");

    if (top5.length === 0) {
      prevEl.innerHTML = `<p style="color:var(--muted2);font-size:13px;padding:4px 0">No scores yet — be the first!</p>`;
      return;
    }

    prevEl.innerHTML = top5.map((p, i) => {
      const rankStr = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`;
      return `
        <div class="lbp-row">
          <span class="lbp-rank">${rankStr}</span>
          <span class="lbp-name">${esc(p.name)}</span>
          <span class="lbp-score">${p.score}</span>
        </div>`;
    }).join("");

  } catch (e) {
    console.error("Login stats error:", e);
    ["login-players-today","login-top-score","login-all-time"].forEach(id => {
      document.getElementById(id).textContent = "—";
    });
  }
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ─── INIT ──────────────────────────────────────────────────────────────────
(function init() {
  // Show login screen properly
  const loginScreen = document.getElementById("login-screen");
  loginScreen.style.display = "flex";

  // Pre-fill name if returning user
  const user = getUser();
  if (user) document.getElementById("login-name").value = user.name;

  // Enter key
  document.getElementById("login-name").addEventListener("keydown", e => {
    if (e.key === "Enter") loginUser();
  });

  // Load live stats
  loadLoginStats();
})();
