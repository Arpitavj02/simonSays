import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 YOUR FIREBASE CONFIG HERE
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

// GAME LOGIC
const buttonColors = ["red", "blue", "green", "yellow"];
let gamePattern = [];
let userClickedPattern = [];
let started = false;
let level = 0;
let score = 0;

let highScore = localStorage.getItem("highScore") || 0;
document.getElementById("high-score").textContent = highScore;

document.getElementById("start-btn").addEventListener("click", () => {
  if (!started) {
    updateStreak();
    startGame();
  }
});

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

function startGame() {
  level = 0;
  score = 0;
  gamePattern = [];
  started = true;

  nextSequence();
}

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

function checkAnswer(currentLevel) {
  if (userClickedPattern[currentLevel] === gamePattern[currentLevel]) {

    if (userClickedPattern.length === gamePattern.length) {
      setTimeout(nextSequence, 800);
    }

  } else {
    gameOver();
  }
}

async function gameOver() {
  playSound("wrong");

  document.body.classList.add("game-over");
  document.getElementById("level-title").textContent = "Game Over";

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
    document.getElementById("high-score").textContent = highScore;
  }

  // SAVE SCORE
  const name = document.getElementById("username").value || "Guest";

  await addDoc(collection(db, "scores"), {
    name: name,
    score: score,
    date: new Date().toDateString()
  });

  loadLeaderboard();
  getTodayPlayers();

  setTimeout(() => document.body.classList.remove("game-over"), 200);

  started = false;
}

function flash(color) {
  const btn = document.getElementById(color);
  btn.classList.add("pressed");
  setTimeout(() => btn.classList.remove("pressed"), 200);
  playSound(color);
}

function animatePress(color) {
  const btn = document.getElementById(color);
  btn.classList.add("pressed");
  setTimeout(() => btn.classList.remove("pressed"), 100);
}

function playSound(name) {
  const audio = new Audio(`sounds/${name}.mp3`);
  audio.play();
}
// 🔥 LEADERBOARD
async function loadLeaderboard() {
  const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(5));
  const snapshot = await getDocs(q);

  let html = "<h3>🏆 Leaderboard</h3>";

  snapshot.forEach(doc => {
    const data = doc.data();
    html += `<p>${data.name}: ${data.score}</p>`;
  });

  document.getElementById("leaderboard").innerHTML = html;
}

// 👥 PLAYERS TODAY
async function getTodayPlayers() {
  const today = new Date().toDateString();
  const snapshot = await getDocs(collection(db, "scores"));

  let count = 0;
  snapshot.forEach(doc => {
    if (doc.data().date === today) count++;
  });

  document.getElementById("players").textContent = count;
}

// 🔥 STREAK
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

// LOAD ON START
loadLeaderboard();
getTodayPlayers();