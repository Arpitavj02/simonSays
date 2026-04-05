import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, limit, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// FIREBASE CONFIG
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
const db = getFirestore(app);

// GAME VARIABLES
const buttonColors = ["red", "blue", "green", "yellow"];
let gamePattern = [];
let userClickedPattern = [];
let started = false;
let level = 0;
let score = 0;

let highScore = localStorage.getItem("highScore") || 0;
document.getElementById("high-score").textContent = highScore;

// LOAD STREAK ON PAGE LOAD
document.getElementById("streak").textContent =
  localStorage.getItem("streak") || 0;

// START BUTTON
document.getElementById("start-btn").addEventListener("click", () => {
  if (!started) {
    updateStreak();
    startGame();
  }
});

// BUTTON CLICK
document.querySelectorAll(".btn").forEach(button => {
  button.addEventListener("click", function () {
    if (!started) return;

    const userColor = this.id;
    userClickedPattern.push(userColor);

    playSound(userColor);
    animatePress(userColor);

    checkAnswer(userClickedPattern.length - 1);
  });
});

// GAME START
function startGame() {
  level = 0;
  score = 0;
  gamePattern = [];
  started = true;

  nextSequence();
}

// NEXT LEVEL
function nextSequence() {
  userClickedPattern = [];
  level++;
  score++;

  document.getElementById("level-title").textContent = "Level " + level;
  document.getElementById("score").textContent = score;

  const randomColor = buttonColors[Math.floor(Math.random() * 4)];
  gamePattern.push(randomColor);

  flash(randomColor);
}

// CHECK ANSWER
function checkAnswer(currentLevel) {
  if (userClickedPattern[currentLevel] === gamePattern[currentLevel]) {
    if (userClickedPattern.length === gamePattern.length) {
      setTimeout(nextSequence, 800);
    }
  } else {
    gameOver();
  }
}

// SAVE BEST SCORE (IMPORTANT FIX)
async function saveScore(name, score) {
  const userRef = doc(db, "scores", name);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists() || score > userSnap.data().score) {
    await setDoc(userRef, {
      name: name,
      score: score,
      date: new Date().toDateString()
    });
  }
}

// GAME OVER
async function gameOver() {
  playSound("wrong");

  document.body.classList.add("game-over");
  document.getElementById("level-title").textContent = "Game Over";

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
    document.getElementById("high-score").textContent = highScore;
  }

  const name = document.getElementById("username").value || "Guest";

  await saveScore(name, score);

  await loadLeaderboard();
  await getTodayPlayers();

  setTimeout(() => document.body.classList.remove("game-over"), 200);

  started = false;
}

// FLASH EFFECT
function flash(color) {
  const btn = document.getElementById(color);
  btn.classList.add("pressed");
  setTimeout(() => btn.classList.remove("pressed"), 200);
  playSound(color);
}

// BUTTON ANIMATION
function animatePress(color) {
  const btn = document.getElementById(color);
  btn.classList.add("pressed");
  setTimeout(() => btn.classList.remove("pressed"), 100);
}

// SOUND
function playSound(name) {
  const audio = new Audio(`sounds/${name}.mp3`);
  audio.play();
}

// LEADERBOARD (WITH RANKS 🏆)
async function loadLeaderboard() {
  const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(5));
  const snapshot = await getDocs(q);

  let html = "<h3>🏆 Leaderboard</h3>";

  let rank = 1;
  snapshot.forEach(doc => {
    const data = doc.data();
    html += `<p>#${rank} ${data.name} — ${data.score}</p>`;
    rank++;
  });

  document.getElementById("leaderboard").innerHTML = html;
}

// PLAYERS TODAY (UNIQUE USERS)
async function getTodayPlayers() {
  const today = new Date().toDateString();
  const snapshot = await getDocs(collection(db, "scores"));

  let uniquePlayers = new Set();

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.date === today) {
      uniquePlayers.add(data.name);
    }
  });

  document.getElementById("players").textContent = uniquePlayers.size;
}

// STREAK SYSTEM
function updateStreak() {
  const today = new Date().toDateString();
  const lastPlayed = localStorage.getItem("lastPlayed");
  let streak = parseInt(localStorage.getItem("streak")) || 0;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastPlayed === today) return;

  if (lastPlayed === yesterday.toDateString()) {
    streak++;
  } else {
    streak = 1;
  }

  localStorage.setItem("streak", streak);
  localStorage.setItem("lastPlayed", today);

  document.getElementById("streak").textContent = streak;
}

// LOAD DATA ON START
loadLeaderboard();
getTodayPlayers();
