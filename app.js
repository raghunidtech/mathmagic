// --- FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    collection,
    query,
    where,
    writeBatch,
    serverTimestamp,
    increment,
    arrayUnion,
    getDocs,
    limit,
    Timestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FIREBASE CONFIG (Provided by environment) ---

// ⬇️⬇️⬇️ PASTE YOUR firebaseConfig OBJECT HERE! ⬇️⬇️⬇️
const firebaseConfig = {
    apiKey: "AIzaSyBCdHHQWC5Q01TqU4wjEs0wxV58tJgOumU",
    authDomain: "geekhub-b44f8.firebaseapp.com",
    projectId: "geekhub-b44f8",
    storageBucket: "geekhub-b44f8.firebasestorage.app",
    messagingSenderId: "573054511027",
    appId: "1:573054511027:web:d584bae6efcf8f3acc8dc6",
    measurementId: "G-2ENT119YTN"
};
// ⬆️⬆️⬆️ PASTE YOUR firebaseConfig OBJECT HERE! ⬆️⬆️⬆️

const appId = firebaseConfig.appId || 'default-geek-hub';

// --- FIREBASE SERVICES ---
let app, auth, db;
try {
    // Check if the placeholder key is still there
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("AIzaSy...") || firebaseConfig.apiKey.includes("YOUR_API_KEY")) {
        throw new Error("API key is a placeholder. Please replace `firebaseConfig` with your project's actual config.");
    }
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    // setLogLevel('debug'); // Uncomment for Firestore logging
} catch (e) {
    console.error("Firebase initialization failed:", e);
    
    // --- SIMPLIFIED AND MORE DIRECT ERROR MESSAGE ---
    let errorMsg = `
        <div style="font-family: monospace; color: black; background-color: #DBEAFE; padding: 20px; border: 4px solid red; font-size: 18px;">
            <h1 style="font-size: 24px; color: red; font-weight: bold;">FIREBASE CONFIGURATION ERROR</h1>
            <p>The game cannot start because your Firebase configuration is incorrect or missing.</p>
            <p style="margin-top: 20px;"><b>Reported Error:</b><br> <span style="color: #B91C1C;">${e.message}</span></p>
            
            <p style="margin-top: 20px;"><b>HOW TO FIX:</b></p>
            <ol style="list-style-position: inside; padding-left: 10px;">
                <li>Go to your project in the <a href="https://console.firebase.google.com/" target="_blank" style="color: blue; text-decoration: underline;">Firebase Console</a>.</li>
                <li>Click the <b>Gear icon</b> ⚙️ (top-left) -> <b>Project settings</b>.</li>
                <li>In the "General" tab, scroll down to "Your apps".</li>
                <li>Find your Web App (icon: <code>&lt;/&gt;</code>) and select "Config".</li>
                <li>Copy the entire <code>const firebaseConfig = { ... };</code> object.</li>
                <li>Paste it into the <code>math_magic_game.html</code> file, replacing the placeholder (around line 435).</li>
            </ol>
             <p style="margin-top: 20px;">The placeholder you need to replace looks like this:</p>
             <pre style="background-color: #F3F4F6; color: #4B5563; padding: 10px; border-radius: 5px; border: 1px solid #D1D5DB; overflow-x: auto;">
const firebaseConfig = {
apiKey: "AIzaSy...YOUR_API_KEY",
authDomain: "YOUR-PROJECT-ID.firebaseapp.com",
projectId: "YOUR-PROJECT-ID",
...
};</pre>
        </div>
    `;
    // --- END OF ERROR MESSAGE ---

    document.body.innerHTML = errorMsg; // Replace page content with this detailed error
}

// --- FIRESTORE COLLECTION PATHS ---
const gameCollectionPath = `artifacts/${appId}/public/data/geek-hub-games`;
const userCollectionPath = `artifacts/${appId}/public/data/users`; // For user profiles

// --- C O N F IG ---
const TOTAL_QUESTIONS_PER_GAME = 5;
const BOT_1_ACCURACY = 0.8;
const BOT_2_ACCURACY = 0.6;
// --- UPDATED: Added Trivia Topics ---
const subTopics = {
    math: [
        { id: 'arithmetic', name: 'ARITHMETIC' },
        { id: 'algebra', name: 'ALGEBRA' },
        { id: 'geometry', name: 'GEOMETRY' },
        { id: 'statistics', name: 'STATISTICS' }
    ],
    trivia: [
        { id: 'general', name: 'GENERAL KNOWLEDGE' },
        { id: 'history', name: 'WORLD HISTORY' }, // Renamed for clarity
        { id: 'history_indian', name: 'INDIAN HISTORY' }, // Added Indian History
        { id: 'movies', name: 'MOVIES' }
    ]
};
const difficultySettings = { easy: { points: 10, time: 5, penalty: -10 }, medium: { points: 20, time: 10, penalty: -10 }, hard: { points: 30, time: 20, penalty: -10 }, veryhard: { points: 40, time: 30, penalty: -10 } };
const difficultyRollMap = { 1: 'easy', 2: 'easy', 3: 'medium', 4: 'medium', 5: 'hard', 6: 'veryhard' };
const difficultyRollText = { 'easy': '(1-2)', 'medium': '(3-4)', 'hard': '(5)', 'veryhard': '(6)' };

// --- Q U E S T IO N B A N K ---
// This will be populated from questions.json
let questionBank = {};

// --- D O M E L E M E N T S --- (Get references to HTML elements)
const screens = { auth: document.getElementById('authScreen'), welcome: document.getElementById('welcomeScreen'), singlePlayerLobby: document.getElementById('singlePlayerLobbyScreen'), multiplayer: document.getElementById('multiplayerScreen'), serverList: document.getElementById('serverListScreen'), lobby: document.getElementById('lobbyScreen'), quiz: document.getElementById('quizScreen'), result: document.getElementById('resultScreen'), gameOver: document.getElementById('gameOverScreen'), };
const authEmail = document.getElementById('authEmail'); const authPassword = document.getElementById('authPassword'); const loginButton = document.getElementById('loginButton'); const registerButton = document.getElementById('registerButton'); const authError = document.getElementById('authError'); const authStatus = document.getElementById('authStatus'); const displayNameInput = document.getElementById('displayNameInput'); const setDisplayNameButton = document.getElementById('setDisplayNameButton'); const signOutButton = document.getElementById('signOutButton'); const singlePlayerButton = document.getElementById('singlePlayerButton'); const multiplayerButton = document.getElementById('multiplayerButton'); const backToMenuButton1 = document.getElementById('backToMenuButton1'); const backToMenuButton2 = document.getElementById('backToMenuButton2'); const backToMultiplayerButton = document.getElementById('backToMultiplayerButton');
const topicSelectSP = document.getElementById('topicSelectSP'); // Added back
const subTopicSelectSP = document.getElementById('subTopicSelectSP');
const singlePlayerStartButton = document.getElementById('singlePlayerStartButton'); const createButton = document.getElementById('createButton'); const makePublicCheckbox = document.getElementById('makePublicCheckbox'); const browseGamesButton = document.getElementById('browseGamesButton'); const gameIdInput = document.getElementById('gameIdInput'); const joinButton = document.getElementById('joinButton'); const publicGameList = document.getElementById('publicGameList'); const refreshServersButton = document.getElementById('refreshServersButton'); const lobbyGameId = document.getElementById('lobbyGameId'); const lobbyPlayerList = document.getElementById('lobbyPlayerList'); const hostControls = document.getElementById('hostControls'); const nonHostText = document.getElementById('nonHostText');
const topicSelectMP = document.getElementById('topicSelectMP'); // Added back
const subTopicSelectMP = document.getElementById('subTopicSelectMP');
const lobbyStartButton = document.getElementById('lobbyStartButton'); const scoreHeader = document.getElementById('scoreHeader'); const gameIdDisplay = document.getElementById('gameIdDisplay'); const questionCount = document.getElementById('questionCount'); const timerArea = document.getElementById('timerArea'); const timerBar = document.getElementById('timerBar'); const diceIcon = document.getElementById('diceIcon'); const rollResult = document.getElementById('rollResult'); const difficultyText = document.getElementById('difficultyText'); const questionText = document.getElementById('questionText'); const numberAnswer = document.getElementById('numberAnswer'); const mcAnswerArea = document.getElementById('mcAnswerArea'); const mcOptionButtons = document.querySelectorAll('.mc-option'); const submitAnswerButton = document.getElementById('submitAnswerButton'); const waitMessage = document.getElementById('waitMessage'); const resultTitle = document.getElementById('resultTitle'); const resultFeedback = document.getElementById('resultFeedback'); const playerResultsList = document.getElementById('playerResultsList'); const nextButton = document.getElementById('nextButton'); const waitHostMessage = document.getElementById('waitHostMessage'); const winnerText = document.getElementById('winnerText'); const finalScoreList = document.getElementById('finalScoreList'); const restartButton = document.getElementById('restartButton');

// --- NEW: Theme Selector Element ---
const themeSelect = document.getElementById('themeSelect');

// --- G A M E S T A T E ---
let gameMode = 'none'; let userId = null; let userDisplayName = "PLAYER"; let gameId = null; let isHost = false; let gameUnsubscribe = null; let playerScore = 0; let bot1Score = 0; let bot2Score = 0; let usedQuestionIndicesSP = {}; let currentQuestion = {}; let currentSettings = {};
let currentTopic = 'math'; // Track main topic
let currentSubTopic = ''; let questionsAnswered = 0; let allPlayers = {}; let usedQuestionIndices = {};
let latestGameData = null; // Store latest game data from listener for MP host
let timerInterval = null; let selectedMCAnswer = null;

// --- G A M E L O G I C ---

// Define handleTimeout function (FIXED - Moved definition up)
function handleTimeout() {
    // Check if already processed (e.g., submitted right before timeout)
    if (screens.result.style.display === 'block' || screens.gameOver.style.display === 'block') return; // More robust check
    if (gameMode === 'multiplayer' && submitAnswerButton.disabled) return; // MP answer already locked

    const playerAnswer = (currentQuestion?.questionType === 'n') ? "" : selectedMCAnswer; // Optional chaining for safety
    // Ensure currentQuestion.answer exists before using it
    const feedback = `Time's up! The answer was ${currentQuestion?.answer ?? 'N/A'}.`; // Added nullish coalescing & optional chaining

    if (gameMode === 'singleplayer') {
        const playerPoints = currentSettings?.penalty || -10; // Use optional chaining and fallback
        const playerFeedback = `Time's up! You lose ${Math.abs(playerPoints)} points. The answer was ${currentQuestion?.answer ?? 'N/A'}.`; // Use optional chaining
        playerScore += playerPoints;
        const bot1Result = simulateBotAnswer(currentQuestion, BOT_1_ACCURACY);
        const bot2Result = simulateBotAnswer(currentQuestion, BOT_2_ACCURACY);
        bot1Score += bot1Result.isCorrect ? (currentSettings?.points || 10) : (currentSettings?.penalty || -10); // Use optional chaining
        bot2Score += bot2Result.isCorrect ? (currentSettings?.points || 10) : (currentSettings?.penalty || -10); // Use optional chaining
        updateLocalScoreDisplay();

        resultTitle.textContent = "TIME'S UP!";
        resultTitle.classList.remove('text-green-500');
        resultTitle.classList.add('text-red-500');
        resultFeedback.textContent = playerFeedback;

        playerResultsList.innerHTML = `
            <li class="text-red-500">YOU (${userDisplayName}): ❌ (Time's Up)</li>
            <li class="${bot1Result.isCorrect ? 'text-green-500' : 'text-red-500'}">BOT 1: ${bot1Result.isCorrect ? '✅' : '❌'} (Answer: ${bot1Result.answer})</li>
            <li class="${bot2Result.isCorrect ? 'text-green-500' : 'text-red-500'}">BOT 2: ${bot2Result.isCorrect ? '✅' : '❌'} (Answer: ${bot2Result.answer})</li>
        `;

        nextButton.textContent = (questionsAnswered >= TOTAL_QUESTIONS_PER_GAME) ? "FINISH" : "NEXT";
        nextButton.classList.remove('hidden');
        waitHostMessage.classList.add('hidden');

        showScreen('result');

    } else {
        if (!userId) return;
        processMultiplayerAnswer(playerAnswer, false, feedback); // Process timeout as wrong answer
    }
}


// Moved handleSubmit and handleNext definition before initApp
function handleSubmit() { /* ... function code ... */
    clearInterval(timerInterval);
    let userAnswer, isCorrect = false;
    // Ensure currentQuestion exists before accessing properties
    if (!currentQuestion || typeof currentQuestion.answer === 'undefined') {
        console.error("handleSubmit called with invalid currentQuestion:", currentQuestion);
        return; // Prevent errors if question data is missing
    }
    if (currentQuestion.questionType === 'n') { userAnswer = numberAnswer.value.trim(); if (userAnswer !== '' && parseFloat(userAnswer) === currentQuestion.answer) isCorrect = true; }
    else { userAnswer = selectedMCAnswer; if (userAnswer === currentQuestion.answer) isCorrect = true; }
    if (gameMode === 'singleplayer') {
        const playerPoints = isCorrect ? (currentSettings?.points || 10) : (currentSettings?.penalty || -10); // Use optional chaining
        let playerFeedback = isCorrect ? `Correct! You gained ${playerPoints} points.` : `Wrong! You lose ${Math.abs(playerPoints)} points.`; if (!isCorrect) playerFeedback += ` The answer was ${currentQuestion.answer}.`; playerScore += playerPoints; const bot1Result = simulateBotAnswer(currentQuestion, BOT_1_ACCURACY); const bot2Result = simulateBotAnswer(currentQuestion, BOT_2_ACCURACY); bot1Score += bot1Result.isCorrect ? (currentSettings?.points || 10) : (currentSettings?.penalty || -10); bot2Score += bot2Result.isCorrect ? (currentSettings?.points || 10) : (currentSettings?.penalty || -10); updateLocalScoreDisplay(); resultTitle.textContent = isCorrect ? "CORRECT!" : "INCORRECT"; resultTitle.classList.toggle('text-green-500', isCorrect); resultTitle.classList.toggle('text-red-500', !isCorrect); resultFeedback.textContent = playerFeedback; playerResultsList.innerHTML = `<li class="${isCorrect ? 'text-green-500' : 'text-red-500'}">YOU (${userDisplayName}): ${isCorrect ? '✅' : '❌'} (Answer: ${userAnswer || "N/A"})</li><li class="${bot1Result.isCorrect ? 'text-green-500' : 'text-red-500'}">BOT 1: ${bot1Result.isCorrect ? '✅' : '❌'} (Answer: ${bot1Result.answer})</li><li class="${bot2Result.isCorrect ? 'text-green-500' : 'text-red-500'}">BOT 2: ${bot2Result.isCorrect ? '✅' : '❌'} (Answer: ${bot2Result.answer})</li>`; nextButton.textContent = (questionsAnswered >= TOTAL_QUESTIONS_PER_GAME) ? "FINISH" : "NEXT"; nextButton.classList.remove('hidden'); waitHostMessage.classList.add('hidden'); showScreen('result');
    } else { if (!userId) return; const feedback = isCorrect ? "Correct!" : `Wrong! The answer was ${currentQuestion.answer}.`; processMultiplayerAnswer(userAnswer, isCorrect, feedback); }
}

function handleNext() {
    if (gameMode === 'singleplayer') {
        loadSinglePlayerQuestion();
    } else if (isHost) {
        // Use the index directly from the latest Firestore data
        if (latestGameData && typeof latestGameData.currentQuestionIndex === 'number') {
            hostLoadQuestion(latestGameData.currentQuestionIndex + 1);
        } else {
            console.error("Host cannot determine next question index. latestGameData:", latestGameData);
            alert("Error loading next question. Please try refreshing.");
        }
    }
}

// --- NEW: Theme Management ---
function applyTheme(themeName) {
    console.log(`Applying theme: ${themeName}`);
    // Remove all theme classes from body
    document.body.classList.remove('theme-cyberpunk', 'theme-vibrant');
    document.body.classList.remove('bg-blue-200', 'text-black'); // Remove default light
    document.body.classList.remove('bg-orange-200', 'text-gray-800'); // Remove vibrant
    document.body.classList.remove('bg-black', 'text-white'); // Remove cyberpunk

    // Add the selected theme class
    if (themeName === 'dark') {
        document.body.classList.add('theme-cyberpunk', 'bg-black', 'text-white');
    } else if (themeName === 'vibrant') {
        document.body.classList.add('theme-vibrant', 'bg-orange-200', 'text-gray-800');
    } else {
        // 'light' is the default
        document.body.classList.add('bg-blue-200', 'text-black');
    }
    
    // Save preference
    try {
        localStorage.setItem('gameTheme', themeName);
    } catch (e) {
        console.warn("Could not save theme to localStorage:", e);
    }
}

function loadTheme() {
    let savedTheme = 'light'; // Default
    try {
        savedTheme = localStorage.getItem('gameTheme') || 'light';
    } catch (e) {
        console.warn("Could not load theme from localStorage:", e);
    }
    
    // Set the dropdown to the saved value
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
    
    // Apply the loaded theme
    applyTheme(savedTheme);
}
// --- End Theme Management ---

// --- NEW: Load questions from JSON ---
async function loadQuestions() {
    try {
        const response = await fetch('./questions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        questionBank = await response.json();
        console.log("Question bank loaded successfully.");
    } catch (e) {
        console.error("Could not load question bank:", e);
        document.body.innerHTML = `<div style="font-family: monospace; color: red; padding: 20px;">
            <h1>CRITICAL ERROR</h1>
            <p>Could not load <code>questions.json</code>.</p>
            <p>Please make sure the file is in the same directory as <code>index.html</code>.</p>
            <p>Error details: ${e.message}</p>
        </div>`;
    }
}


async function initApp() {
    // --- NEW: Wait for questions to load before initializing ---
    await loadQuestions();

    // Check if question bank is empty after loading
    if (Object.keys(questionBank).length === 0) {
        console.error("Question bank is empty. Halting app initialization.");
        return; // Stop if questions failed to load
    }

    // --- Original initApp code continues here ---
    loginButton.addEventListener('click', handleLogin);
    registerButton.addEventListener('click', handleRegister);
    signOutButton.addEventListener('click', handleLogout);
    setDisplayNameButton.addEventListener('click', handleSetDisplayName);
    singlePlayerButton.addEventListener('click', showSinglePlayerSetup);
    multiplayerButton.addEventListener('click', showMultiplayerSetup);
    backToMenuButton1.addEventListener('click', () => showScreen('welcome'));
    backToMenuButton2.addEventListener('click', () => showScreen('welcome'));
    topicSelectSP.addEventListener('change', () => populateSubTopics('SP')); // Added listener
    singlePlayerStartButton.addEventListener('click', startSinglePlayerGame);
    topicSelectMP.addEventListener('change', () => populateSubTopics('MP')); // Added listener
    createButton.addEventListener('click', createGame);
    joinButton.addEventListener('click', joinGame);
    lobbyStartButton.addEventListener('click', hostStartGame);
    browseGamesButton.addEventListener('click', browsePublicGames);
    refreshServersButton.addEventListener('click', queryPublicGames);
    backToMultiplayerButton.addEventListener('click', () => showScreen('multiplayer'));

    // --- NEW: Theme Selector Listener ---
    themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
    // --- Load the saved theme on startup ---
    loadTheme();

    // Use already defined functions
    submitAnswerButton.addEventListener('click', handleSubmit);
    nextButton.addEventListener('click', handleNext);

    restartButton.addEventListener('click', resetGame);
    mcOptionButtons.forEach(btn => btn.addEventListener('click', () => selectMCAnswer(btn)));
    numberAnswer.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleSubmit(); });

    // Populate dropdowns initially
    populateSubTopics('SP');
    populateSubTopics('MP');

    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                try {
                    const userDocRef = doc(db, userCollectionPath, userId);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists() && userDocSnap.data().displayName) {
                        userDisplayName = userDocSnap.data().displayName;
                    } else {
                        userDisplayName = user.email ? user.email.split('@')[0] : `USER${user.uid.substring(0, 4)}`;
                        await setDoc(userDocRef, { displayName: userDisplayName }, { merge: true });
                    }
                } catch (e) {
                    console.error("Error fetching/setting user profile:", e);
                    userDisplayName = user.email ? user.email.split('@')[0] : `USER${user.uid.substring(0, 4)}`;
                }
                displayNameInput.value = userDisplayName;
                authStatus.textContent = `Logged in as: ${user.email}`;
                authStatus.classList.remove('hidden');
                showScreen('welcome');
            } else {
                userId = null;
                userDisplayName = "PLAYER";
                authStatus.classList.add('hidden');
                resetGame();
                showScreen('auth');
            }
        });
    } else {
        showScreen('auth');
    }
}


// --- AUTH FUNCTIONS ---
async function handleLogin() { /* ... function code ... */
    const email = authEmail.value; const password = authPassword.value; authError.classList.add('hidden'); if (!email || !password) { authError.textContent = "Please enter both email and password."; authError.classList.remove('hidden'); return; }
    try { await signInWithEmailAndPassword(auth, email, password); } catch (e) { console.error("Login Error:", e.code, e.message); if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') { authError.textContent = "Incorrect email or password."; } else if (e.code === 'auth/invalid-email') { authError.textContent = "Please enter a valid email address."; } else if (e.code === 'auth/too-many-requests') { authError.textContent = "Too many login attempts. Please try again later."; } else { authError.textContent = "Login failed. Please try again."; } authError.classList.remove('hidden'); }
}
async function handleRegister() { /* ... function code ... */
    const email = authEmail.value; const password = authPassword.value; authError.classList.add('hidden'); if (!email || !password) { authError.textContent = "Please enter both email and password."; authError.classList.remove('hidden'); return; }
    try { if (password.length < 6) throw { code: 'auth/weak-password', message: "Password should be at least 6 characters." }; if (!email.includes('@') || !email.includes('.')) throw { code: 'auth/invalid-email', message: "Please enter a valid email address." }; const userCredential = await createUserWithEmailAndPassword(auth, email, password); const newUser = userCredential.user; const defaultDisplayName = newUser.email ? newUser.email.split('@')[0] : `USER${newUser.uid.substring(0, 4)}`; const userDocRef = doc(db, userCollectionPath, newUser.uid); await setDoc(userDocRef, { displayName: defaultDisplayName, createdAt: serverTimestamp() }); console.log("User profile created."); } catch (e) { console.error("Register Error:", e.code, e.message); if (e.code === 'auth/email-already-in-use') { authError.textContent = "This email is already registered."; } else if (e.code === 'auth/weak-password') { authError.textContent = "Password should be at least 6 characters."; } else if (e.code === 'auth/invalid-email') { authError.textContent = "Please enter a valid email address."; } else { authError.textContent = e.message || "Registration failed. Please try again."; } authError.classList.remove('hidden'); }
}
async function handleLogout() { /* ... function code ... */
    try { await signOut(auth); } catch (e) { console.error("Sign Out Error:", e); }
}
async function handleSetDisplayName() { /* ... function code ... */
    if (!userId) { alert("Not logged in."); return; } const newName = displayNameInput.value.trim(); if (newName && newName.length <= 15) { userDisplayName = newName; try { const userDocRef = doc(db, userCollectionPath, userId); await setDoc(userDocRef, { displayName: newName }, { merge: true }); alert(`Display Name set to: ${userDisplayName}`); } catch (e) { console.error("Error saving display name:", e); alert("Error saving name."); } } else if (newName.length > 15) { alert("Name must be 15 characters or less."); } else { alert("Please enter a name."); }
}
// --- END AUTH FUNCTIONS ---

function showSinglePlayerSetup() { /* ... function code ... */
    gameMode = 'singleplayer'; showScreen('singlePlayerLobby');
}
function showMultiplayerSetup() { /* ... function code ... */
    gameMode = 'multiplayer'; showScreen('multiplayer');
}
// --- UPDATED: Handles both math and trivia ---
function populateSubTopics(modePrefix) {
    const topicSelect = (modePrefix === 'SP') ? topicSelectSP : topicSelectMP;
    const subTopicSelect = (modePrefix === 'SP') ? subTopicSelectSP : subTopicSelectMP;
    const selectedTopic = topicSelect.value; // 'math' or 'trivia'
    const subs = subTopics[selectedTopic]; // Get relevant subtopics

    subTopicSelect.innerHTML = ''; // Clear existing
    if (subs) { // Check if subtopics exist for the selected topic
        subs.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = sub.name;
            subTopicSelect.appendChild(option);
        });
    } else {
        console.error(`No subtopics found for topic: ${selectedTopic}`);
    }
}

// --- SINGLE PLAYER ---
function startSinglePlayerGame() { /* ... function code ... */
    console.log("[DEBUG SP] Starting single player game..."); // DEBUG
    playerScore = 0; bot1Score = 0; bot2Score = 0; questionsAnswered = 0;
    usedQuestionIndicesSP = {}; // Clear previous game's used questions
    currentTopic = topicSelectSP.value; // Store the main topic
    currentSubTopic = subTopicSelectSP.value;
    console.log(`[DEBUG SP] Selected topic: ${currentTopic}, branch: ${currentSubTopic}`); // DEBUG

    // ---> NEW DEFENSIVE INIT: Ensure structure exists BEFORE first load <---
    if (!usedQuestionIndicesSP[currentSubTopic]) {
        console.log(`[DEBUG SP] Initializing used questions structure for ${currentSubTopic} in startSinglePlayerGame`); // DEBUG
        usedQuestionIndicesSP[currentSubTopic] = { easy: [], medium: [], hard: [], veryhard: [] };
    }
    // ---> END NEW DEFENSIVE INIT <---

    updateLocalScoreDisplay();
    scoreHeader.classList.remove('hidden');
    timerArea.classList.remove('hidden');
    loadSinglePlayerQuestion();
}
function loadSinglePlayerQuestion() { /* ... function code ... */
    console.log("[DEBUG SP] Loading single player question..."); // DEBUG
    if (questionsAnswered >= TOTAL_QUESTIONS_PER_GAME) { endSinglePlayerGame(); return; } const roll = Math.floor(Math.random() * 6) + 1; let difficulty = difficultyRollMap[roll]; console.log(`[DEBUG SP] Rolled ${roll} -> difficulty ${difficulty}`); // DEBUG
    // Use currentTopic AND currentSubTopic
    let bank = questionBank[currentSubTopic]?.[difficulty]; if (!bank || bank.length === 0) {
        console.log(`[DEBUG SP] No questions for ${currentSubTopic}/${difficulty}, falling back to easy.`); // DEBUG
        difficulty = 'easy'; bank = questionBank[currentSubTopic]?.['easy']; if (!bank || bank.length === 0) { console.error(`[DEBUG SP] CRITICAL: No questions found for topic ${currentSubTopic} even in easy.`); alert("Error: No questions found for this topic."); resetGame(); return; }
    }

    // --- Structure should already exist from startSinglePlayerGame, but double-check ---
    if (!usedQuestionIndicesSP[currentSubTopic] || !usedQuestionIndicesSP[currentSubTopic][difficulty]) {
        console.error(`[DEBUG SP] CRITICAL: usedQuestionIndicesSP structure missing for ${currentSubTopic} - ${difficulty}. Re-initializing.`);
        // Force re-initialization if something went wrong
        if (!usedQuestionIndicesSP[currentSubTopic]) {
            usedQuestionIndicesSP[currentSubTopic] = { easy: [], medium: [], hard: [], veryhard: [] };
        } else if (!usedQuestionIndicesSP[currentSubTopic][difficulty]) {
            // Initialize only the missing difficulty array if subtopic exists
            usedQuestionIndicesSP[currentSubTopic][difficulty] = [];
        }
    }
    // --- End structure double-check ---
    
    const usedBankIndices = usedQuestionIndicesSP[currentSubTopic][difficulty]; const allBankIndices = Array.from({ length: bank.length }, (_, i) => i); let availableIndices = allBankIndices.filter(index => !usedBankIndices.includes(index)); if (availableIndices.length === 0) { console.log(`Resetting used SP questions for ${currentSubTopic} - ${difficulty}`); usedQuestionIndicesSP[currentSubTopic][difficulty] = []; availableIndices = allBankIndices; if (availableIndices.length === 0) { console.error(`CRITICAL SP: Empty bank for ${currentSubTopic} - ${difficulty}`); alert("Error: No available questions."); resetGame(); return; } } const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]; const qData = bank[randomIndex]; usedQuestionIndicesSP[currentSubTopic][difficulty].push(randomIndex); currentQuestion = { question: qData.q, questionType: qData.t, answer: qData.a, options: qData.o || [] }; currentSettings = difficultySettings[difficulty]; displayQuestion({ currentQuestion: currentQuestion, currentSettings: currentSettings, diceRoll: roll, difficulty: difficulty }); questionsAnswered++; questionCount.textContent = `Q: ${questionsAnswered}/${TOTAL_QUESTIONS_PER_GAME}`; showScreen('quiz');
}
function updateLocalScoreDisplay() { /* ... function code ... */
    scoreHeader.innerHTML = `<span class="text-green-500">${userDisplayName}: ${playerScore}</span><span class="text-cyan-400">BOT 1: ${bot1Score}</span><span class="text-cyan-400">BOT 2: ${bot2Score}</span>`;
}
function endSinglePlayerGame() { /* ... function code ... */
    const scores = [{ name: userDisplayName, score: playerScore }, { name: 'BOT 1', score: bot1Score }, { name: 'BOT 2', score: bot2Score }]; scores.sort((a, b) => b.score - a.score); const winner = scores[0]; const isTie = scores.length > 1 && scores[0].score === scores[1].score; winnerText.className = "font-heading text-3xl mb-6"; if (isTie) { winnerText.textContent = "IT'S A TIE!"; winnerText.classList.add('text-yellow-400'); } else { winnerText.textContent = `${winner.name} WINS!`; winnerText.classList.add(winner.name === userDisplayName ? 'text-green-500' : 'text-red-500'); } finalScoreList.innerHTML = ''; scores.forEach(s => { const li = document.createElement('li'); li.textContent = `${s.name}: ${s.score}`; finalScoreList.appendChild(li); }); showScreen('gameOver');
}

// --- MULTIPLAYER ---
async function browsePublicGames() { /* ... function code ... */
    console.log("[DEBUG] Browsing public games..."); showScreen('serverList'); await queryPublicGames();
}
async function queryPublicGames() { /* ... function code ... */
    publicGameList.innerHTML = '<li>Loading...</li>'; console.log("[DEBUG] Querying public games from Firestore...");
    try { const q = query(collection(db, gameCollectionPath), where("status", "==", "lobby"), where("public", "==", true), limit(10)); const querySnapshot = await getDocs(q); console.log(`[DEBUG] Found ${querySnapshot.size} public games potentially.`); const recentGames = []; const oneHourAgo = Timestamp.now().seconds - 3600; querySnapshot.forEach(doc => { const game = doc.data(); if ((game.createdAt && game.createdAt.seconds > oneHourAgo) || !game.createdAt) { recentGames.push({ id: doc.id, ...game }); } }); console.log(`[DEBUG] Filtered to ${recentGames.length} recent.`); if (recentGames.length === 0) { publicGameList.innerHTML = '<li>No public games found.</li>'; return; } publicGameList.innerHTML = ''; recentGames.sort((a, b) => Object.keys(b.players || {}).length - Object.keys(a.players || {}).length); recentGames.forEach((game) => { const hostId = game.hostId; const hostName = (game.players && game.players[hostId]) ? game.players[hostId].name : "Host"; const li = document.createElement('li'); li.textContent = `Host: ${hostName} | Players: ${Object.keys(game.players || {}).length} | Topic: ${game.topic || 'N/A'}`; // Show topic
    li.dataset.gameId = game.id; li.addEventListener('click', () => joinGameById(game.id)); li.classList.add('list-item', 'list-item-hover'); publicGameList.appendChild(li); }); } catch (e) { console.error("Error querying public games: ", e); publicGameList.innerHTML = e.message.includes("indexes") ? '<li>Error: Index needed in Firestore.</li>' : '<li>Error loading games.</li>'; }
}
function joinGameById(id) { /* ... function code ... */
    console.log(`[DEBUG] Joining public game ID: ${id}`); gameIdInput.value = id; joinGame();
}
async function createGame() { /* ... function code ... */
    console.log("[DEBUG] Create Game clicked."); if (!userId) { alert("Authenticating..."); return; } isHost = true; const isPublic = makePublicCheckbox.checked; console.log(`[DEBUG] Creating. Public: ${isPublic}`);
    // --- NO LONGER SIMPLIFIED ---
    const newGame = { hostId: userId, status: "lobby", public: isPublic, /* No topic/subtopic initially */ players: { [userId]: { score: 0, name: userDisplayName } }, createdAt: serverTimestamp(), usedQuestionIndices: {} };
    try { console.log("[DEBUG] Adding doc..."); const gameRef = await addDoc(collection(db, gameCollectionPath), newGame); gameId = gameRef.id; console.log(`[DEBUG] Created ID: ${gameId}`); joinLobby(gameId); } catch (e) { console.error("Error creating game: ", e); alert(`Error creating game: ${e.message}`); }
}
async function joinGame() { /* ... function code ... */
    console.log("[DEBUG] Join Game clicked."); if (!userId) { alert("Authenticating..."); return; } const idToJoin = gameIdInput.value.trim(); if (!idToJoin) { alert("Please enter ID."); return; } console.log(`[DEBUG] Joining ID: ${idToJoin}`); isHost = false; const gameRef = doc(db, gameCollectionPath, idToJoin); try { console.log("[DEBUG] Checking exists..."); const gameSnap = await getDoc(gameRef); if (!gameSnap.exists()) { alert("Game not found!"); return; } console.log("[DEBUG] Found. Checking status..."); if (gameSnap.data().status !== 'lobby') { return alert("Game started!"); } console.log("[DEBUG] Adding player..."); await updateDoc(gameRef, { [`players.${userId}`]: { score: 0, name: userDisplayName } }); console.log("[DEBUG] Player added."); gameId = idToJoin; joinLobby(gameId); } catch (e) { console.error("Error joining game: ", e); alert(`Error joining: ${e.message}`); }
}
function joinLobby(id) { /* ... function code ... */
    console.log(`[DEBUG] Joining lobby ID: ${id}`); lobbyGameId.textContent = id; gameIdDisplay.textContent = `GAME ID: ${id}`; gameIdDisplay.classList.remove('hidden'); hostControls.classList.toggle('hidden', !isHost); nonHostText.classList.toggle('hidden', isHost); listenToGame(id); showScreen('lobby');
}
function listenToGame(id) { /* ... function code ... */
    console.log(`[DEBUG] Listening ID: ${id}`); if (gameUnsubscribe) { gameUnsubscribe(); gameUnsubscribe = null; } const gameRef = doc(db, gameCollectionPath, id); gameUnsubscribe = onSnapshot(gameRef, (docSnap) => { console.log("[DEBUG] Listener update."); let gameData; if (!docSnap.exists()) { if (gameMode === 'multiplayer') { alert("Game deleted!"); resetGame(); } return; } gameData = docSnap.data(); console.log("[DEBUG] State:", gameData.status); if (gameData.players && !gameData.players[userId] && gameData.status !== 'finished' && gameData.status !== 'lobby') { if (gameMode === 'multiplayer') { alert("Removed from game."); resetGame(); } return; } allPlayers = gameData.players || {};
    currentTopic = gameData.topic; // Get main topic
    currentSubTopic = gameData.subTopic; // Host sets this
    questionsAnswered = gameData.currentQuestionIndex || 0; usedQuestionIndices = gameData.usedQuestionIndices || {}; updateMultiplayerScoreDisplay(allPlayers); switch (gameData.status) { case "lobby": updateLobbyList(allPlayers, gameData); showScreen('lobby'); break; case "playing": scoreHeader.classList.remove('hidden'); timerArea.classList.remove('hidden'); questionCount.textContent = `Q: ${questionsAnswered + 1}/${TOTAL_QUESTIONS_PER_GAME}`; displayQuestion(gameData); const alreadyAnswered = (gameData.answeredBy || []).includes(userId); submitAnswerButton.disabled = alreadyAnswered; submitAnswerButton.classList.toggle('btn-gray', alreadyAnswered); submitAnswerButton.classList.toggle('btn-yellow', !alreadyAnswered); waitMessage.classList.toggle('hidden', !alreadyAnswered); latestGameData = gameData; showScreen('quiz'); break; case "results": scoreHeader.classList.remove('hidden'); timerArea.classList.add('hidden'); displayMultiplayerResults(gameData); latestGameData = gameData; showScreen('result'); break; case "finished": scoreHeader.classList.remove('hidden'); timerArea.classList.add('hidden'); displayMultiplayerGameOver(gameData); latestGameData = gameData; showScreen('gameOver'); break; } }, (error) => { console.error("Listener error:", error); if (gameMode === 'multiplayer') { alert("Connection error."); resetGame(); } });
}
function updateLobbyList(players, gameData) { /* ... function code ... */
    lobbyPlayerList.innerHTML = ''; const sortedPids = Object.keys(players).sort((a, b) => { if (a === gameData?.hostId) return -1; if (b === gameData?.hostId) return 1; return (players[a]?.name || '').localeCompare(players[b]?.name || ''); }); sortedPids.forEach(pid => { const p = players[pid]; if (!p) return; const li = document.createElement('li'); li.textContent = `${p.name} (Score: ${p.score})`; if (pid === userId) li.textContent += " (You)"; if (gameData && pid === gameData.hostId) li.textContent += " (Host)"; li.classList.add('list-item'); lobbyPlayerList.appendChild(li); });
}
function updateMultiplayerScoreDisplay(players) { /* ... function code ... */
    scoreHeader.innerHTML = ''; const playerIdsSorted = Object.keys(players).sort((a, b) => (players[a]?.name || '').localeCompare(players[b]?.name || '')); playerIdsSorted.forEach(pid => { const p = players[pid]; if (!p) return; const span = document.createElement('span'); span.textContent = `${p.name}: ${p.score}`; span.className = (pid === userId) ? "text-green-500" : "text-cyan-400"; scoreHeader.appendChild(span); });
}
async function hostStartGame() { /* ... function code ... */
    console.log("[DEBUG] Host starting..."); if (!isHost) return; const gameRef = doc(db, gameCollectionPath, gameId); try {
        // --- Set BOTH topic and subtopic ---
        await updateDoc(gameRef, { topic: topicSelectMP.value, subTopic: subTopicSelectMP.value, usedQuestionIndices: {} });
        hostLoadQuestion(0); } catch (e) { console.error("Error starting game: ", e); alert(`Error: ${e.message}`); }
}
async function hostLoadQuestion(questionIndex) { /* ... function code ... */
    console.log(`[DEBUG] Host load Q${questionIndex}`); if (!isHost || gameMode !== 'multiplayer') return; const gameRef = doc(db, gameCollectionPath, gameId); let currentGameData; try { const gameSnap = await getDoc(gameRef); if (!gameSnap.exists()) { return; } currentGameData = gameSnap.data();
    currentTopic = currentGameData.topic; // Get main topic
    currentSubTopic = currentGameData.subTopic; // Use subtopic set by host
    usedQuestionIndices = currentGameData.usedQuestionIndices || {}; allPlayers = currentGameData.players || {}; } catch (e) { console.error("Error get game data:", e); return; } if (questionIndex >= TOTAL_QUESTIONS_PER_GAME) { await hostEndGame(); return; } const roll = Math.floor(Math.random() * 6) + 1; let difficulty = difficultyRollMap[roll]; console.log(`[DEBUG] Roll ${roll} -> ${difficulty}`);
    // --- Use currentTopic AND currentSubTopic ---
    let bank = questionBank[currentSubTopic]?.[difficulty]; if (!bank || bank.length === 0) { difficulty = 'easy'; bank = questionBank[currentSubTopic]?.['easy']; if (!bank || bank.length === 0) { console.error(`[DEBUG MP] CRITICAL: No questions found for topic ${currentSubTopic} even in easy.`); alert("Error: No questions found for this topic."); resetGame(); return; } }
    if (!usedQuestionIndices[currentSubTopic]) usedQuestionIndices[currentSubTopic] = { easy: [], medium: [], hard: [], veryhard: [] }; if (!usedQuestionIndices[currentSubTopic][difficulty]) usedQuestionIndices[currentSubTopic][difficulty] = []; const usedBankIndices = usedQuestionIndices[currentSubTopic][difficulty]; const allBankIndices = Array.from({ length: bank.length }, (_, i) => i); let availableIndices = allBankIndices.filter(index => !usedBankIndices.includes(index)); console.log(`[DEBUG] Avail ${difficulty}: ${availableIndices.length}/${allBankIndices.length}`); if (availableIndices.length === 0) { console.log(`[DEBUG] Reset used ${difficulty}`); usedQuestionIndices[currentSubTopic][difficulty] = []; availableIndices = allBankIndices; if (availableIndices.length === 0) { console.error(`[DEBUG MP] CRITICAL: Empty bank for ${currentSubTopic} - ${difficulty}`); alert("Error: No available questions."); resetGame(); return; } } const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]; const qData = bank[randomIndex]; console.log(`[DEBUG] Sel index ${randomIndex}`); usedQuestionIndices[currentSubTopic][difficulty].push(randomIndex); const newQuestion = { question: qData.q, questionType: qData.t, answer: qData.a, options: qData.o || [] }; const newSettings = difficultySettings[difficulty]; const playersUpdate = { ...allPlayers }; Object.keys(playersUpdate).forEach(pid => { playersUpdate[pid].lastAnswer = null; }); try { console.log(`[DEBUG] Update Firestore Q${questionIndex + 1}`); await updateDoc(gameRef, { status: "playing", currentQuestionIndex: questionIndex, currentQuestion: newQuestion, currentSettings: newSettings, diceRoll: roll, difficulty: difficulty, players: playersUpdate, answeredBy: [], usedQuestionIndices: usedQuestionIndices }); console.log("[DEBUG] Update success."); } catch (e) { console.error("Error loading Q Firestore: ", e); alert(`Error: ${e.message}`); }
}
async function processMultiplayerAnswer(answer, isCorrect, feedback) { /* ... function code ... */
    console.log(`[DEBUG] Process A: ${answer}, Correct: ${isCorrect}`); submitAnswerButton.disabled = true; submitAnswerButton.classList.add('btn-gray'); submitAnswerButton.classList.remove('btn-yellow'); waitMessage.classList.remove('hidden'); const points = isCorrect ? (currentSettings?.points || 10) : (currentSettings?.penalty || -10); console.log(`[DEBUG] Points: ${points}`); const answerPayload = { answer: answer, isCorrect: isCorrect, feedback: feedback, points: points }; const gameRef = doc(db, gameCollectionPath, gameId); try { console.log("[DEBUG] Check pre-A state..."); const gameSnap = await getDoc(gameRef); if (!gameSnap.exists()) { return; } const gameData = gameSnap.data(); if ((gameData.answeredBy || []).includes(userId)) { console.warn("[DEBUG] Already answered pre-A."); return; } console.log("[DEBUG] Submitting A Firestore..."); await updateDoc(gameRef, { [`players.${userId}.lastAnswer`]: answerPayload, [`players.${userId}.score`]: increment(points), answeredBy: arrayUnion(userId) }); console.log("[DEBUG] Submit A success."); if (isHost) { console.log("[DEBUG] Host post-A check..."); const updatedSnap = await getDoc(gameRef); if (!updatedSnap.exists()) return; const updatedData = updatedSnap.data(); const currentAnsweredCount = (updatedData.answeredBy || []).length; const totalPlayers = Object.keys(updatedData.players).length; console.log(`[DEBUG] Post-A count: ${currentAnsweredCount}/${totalPlayers}`); if (currentAnsweredCount >= totalPlayers) { console.log("[DEBUG] Trigger checkAll soon."); setTimeout(checkAllAnswered, 200); } } } catch (e) { console.error("Error submitting A: ", e); alert(`Error: ${e.message}`); submitAnswerButton.disabled = false; submitAnswerButton.classList.remove('btn-gray'); submitAnswerButton.classList.add('btn-yellow'); waitMessage.classList.add('hidden'); }
}
async function checkAllAnswered() { /* ... function code ... */
    console.log("[DEBUG] checkAll called."); if (!isHost) { return; } const gameRef = doc(db, gameCollectionPath, gameId); try { console.log("[DEBUG] Host checking state..."); const gameSnap = await getDoc(gameRef); if (!gameSnap.exists()) { return; } const gameData = gameSnap.data(); if (gameData.status !== 'playing') { console.log(`[DEBUG] Status ${gameData.status}. Abort.`); return; } const playerIds = Object.keys(gameData.players); const answeredIds = gameData.answeredBy || []; console.log(`[DEBUG] Check count: ${answeredIds.length}/${playerIds.length}`); if (answeredIds.length >= playerIds.length) { console.log("[DEBUG] Moving to results."); await updateDoc(gameRef, { status: "results" }); } else { console.log("[DEBUG] Not all answered."); } } catch (e) { console.error("Error checking A's: ", e); }
}
function displayMultiplayerResults(gameData) { /* ... function code ... */
    console.log("[DEBUG] Display MP results."); timerArea.classList.add('hidden'); const myResult = gameData.players[userId]?.lastAnswer; if (myResult) { resultTitle.textContent = myResult.isCorrect ? "CORRECT!" : "INCORRECT"; resultTitle.classList.toggle('text-green-500', myResult.isCorrect); resultTitle.classList.toggle('text-red-500', !myResult.isCorrect); resultFeedback.textContent = `${myResult.feedback} You got ${myResult.points} points.`; } else { resultTitle.textContent = "RESULTS"; resultTitle.classList.remove('text-green-500', 'text-red-500'); resultFeedback.textContent = "Waiting..."; } playerResultsList.innerHTML = ''; const sortedPlayerIds = Object.keys(gameData.players).sort((a, b) => (gameData.players[b]?.score || 0) - (gameData.players[a]?.score || 0)); sortedPlayerIds.forEach(pid => { const p = gameData.players[pid]; if (!p) return; const res = p.lastAnswer; const li = document.createElement('li'); li.textContent = `${p.name}: ${res ? (res.isCorrect ? '✅' : '❌') : '⌛'} (Ans: ${res ? res.answer : "N/A"}) Score: ${p.score}`; if (res) li.classList.add(res.isCorrect ? 'text-green-500' : 'text-red-500'); li.classList.add('list-item'); playerResultsList.appendChild(li); }); nextButton.classList.toggle('hidden', !isHost); waitHostMessage.classList.toggle('hidden', isHost); nextButton.textContent = (questionsAnswered + 1 >= TOTAL_QUESTIONS_PER_GAME) ? "FINISH GAME" : "NEXT (HOST ONLY)";
}
async function hostEndGame() { /* ... function code ... */
    console.log("[DEBUG] Host ending."); if (!isHost) return; const gameRef = doc(db, gameCollectionPath, gameId); try { await updateDoc(gameRef, { status: "finished" }); console.log("[DEBUG] Status finished."); } catch (e) { console.error("Error ending game: ", e); }
}
function displayMultiplayerGameOver(gameData) { /* ... function code ... */
    console.log("[DEBUG] Display MP game over."); timerArea.classList.add('hidden'); const scores = Object.values(gameData.players).map(p => ({ name: p.name, score: p.score })); scores.sort((a, b) => b.score - a.score); const winner = scores[0]; const isTie = scores.length > 1 && scores[0].score === scores[1].score; winnerText.className = "font-heading text-3xl mb-6"; if (isTie) { winnerText.textContent = "IT'S A TIE!"; winnerText.classList.add('text-yellow-400'); } else { winnerText.textContent = `${winner.name} WINS!`; const amWinner = (winner.name === userDisplayName); winnerText.classList.add(amWinner ? 'text-green-500' : 'text-red-500'); } finalScoreList.innerHTML = ''; scores.forEach(s => { const li = document.createElement('li'); li.textContent = `${s.name}: ${s.score}`; finalScoreList.appendChild(li); }); showScreen('gameOver');
}

// --- SHARED FUNCTIONS ---
function displayQuestion(gameData) { /* ... function code ... */
    currentQuestion = gameData.currentQuestion; currentSettings = gameData.currentSettings; if (!currentQuestion || !currentSettings || !gameData.difficulty) { console.error("Invalid game data:", gameData); alert("Error loading question."); resetGame(); return; } console.log(`[DEBUG] Display Q ${questionsAnswered + 1}:`, currentQuestion.question); rollResult.textContent = `ROLL ${gameData.diceRoll} ${difficultyRollText[gameData.difficulty]}`; difficultyText.textContent = `-> ${gameData.difficulty.toUpperCase()}`; diceIcon.classList.remove('dice-roll-animation'); void diceIcon.offsetWidth; diceIcon.classList.add('dice-roll-animation'); questionText.textContent = currentQuestion.question; if (currentQuestion.questionType === 'n') { numberAnswer.value = ''; numberAnswer.classList.remove('hidden'); mcAnswerArea.classList.add('hidden'); numberAnswer.focus(); } else { mcAnswerArea.classList.remove('hidden'); numberAnswer.classList.add('hidden'); const shuffledOptions = shuffleArray(currentQuestion.options || []); mcOptionButtons.forEach((btn, index) => { if (shuffledOptions[index]) { btn.textContent = shuffledOptions[index]; btn.classList.remove('hidden'); } else { btn.classList.add('hidden'); } }); } selectedMCAnswer = null; mcOptionButtons.forEach(btn => btn.classList.replace('btn-yellow', 'btn-cyan')); submitAnswerButton.disabled = false; submitAnswerButton.classList.remove('btn-gray'); submitAnswerButton.classList.add('btn-yellow'); waitMessage.classList.add('hidden'); startTimer(currentSettings.time);
}
function startTimer(timeInSeconds) { /* ... function code ... */
    clearInterval(timerInterval); let timeLimit = timeInSeconds * 1000; let timerStartTime = Date.now(); console.log(`[DEBUG] Start timer: ${timeInSeconds}s`); timerBar.style.width = '100%'; timerBar.classList.remove('bg-yellow-500', 'bg-red-500'); timerBar.classList.add('bg-green-500'); timerInterval = setInterval(() => { const elapsed = Date.now() - timerStartTime; const percentRemaining = Math.max(0, (timeLimit - elapsed) / timeLimit); timerBar.style.width = `${percentRemaining * 100}%`; if (percentRemaining < 0.25 && !timerBar.classList.contains('bg-red-500')) { timerBar.classList.remove('bg-yellow-500', 'bg-green-500'); timerBar.classList.add('bg-red-500'); } else if (percentRemaining < 0.5 && !timerBar.classList.contains('bg-yellow-500') && !timerBar.classList.contains('bg-red-500')) { timerBar.classList.remove('bg-green-500'); timerBar.classList.add('bg-yellow-500'); } if (percentRemaining <= 0) { console.log("[DEBUG] Timer expired."); clearInterval(timerInterval); handleTimeout(); return; } }, 100);
}
function selectMCAnswer(selectedButton) { /* ... function code ... */
    mcOptionButtons.forEach(btn => btn.classList.replace('btn-yellow', 'btn-cyan')); selectedButton.classList.replace('btn-cyan', 'btn-yellow'); selectedMCAnswer = selectedButton.textContent; console.log(`[DEBUG] MC selected: ${selectedMCAnswer}`);
}
function resetGame() { /* ... function code ... */
    console.log("[DEBUG] Resetting..."); clearInterval(timerInterval); if (gameUnsubscribe) { gameUnsubscribe(); gameUnsubscribe = null; console.log("[DEBUG] Unsubscribed."); } gameMode = 'none'; gameId = null; isHost = false; currentQuestion = {}; currentSettings = {}; questionsAnswered = 0; allPlayers = {}; playerScore = 0; bot1Score = 0; bot2Score = 0; usedQuestionIndicesSP = {}; usedQuestionIndices = {};
    latestGameData = null; // Reset latest game data
    gameIdDisplay.classList.add('hidden'); gameIdDisplay.textContent = 'GAME ID: ...'; scoreHeader.classList.add('hidden'); scoreHeader.innerHTML = ''; questionCount.textContent = ""; timerArea.classList.add('hidden'); authError.classList.add('hidden'); authError.textContent = 'Error processing request!'; winnerText.className = "font-heading text-3xl text-green-500 mb-6"; winnerText.textContent = 'PLAYER WINS!'; winnerText.classList.remove('text-yellow-400', 'text-red-500', 'text-green-500'); authEmail.value = ''; authPassword.value = ''; displayNameInput.value = userDisplayName || 'PLAYER'; gameIdInput.value = ''; numberAnswer.value = ''; submitAnswerButton.disabled = false; submitAnswerButton.classList.remove('btn-gray'); submitAnswerButton.classList.add('btn-yellow'); waitMessage.classList.add('hidden'); if (auth?.currentUser) { console.log("[DEBUG] Reset to welcome."); showScreen('welcome'); } else { console.log("[DEBUG] Reset to auth."); showScreen('auth'); }
}
function showScreen(screenName) { /* ... function code ... */
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none'); const screen = document.getElementById(`${screenName}Screen`); if (screen) { screen.style.display = 'block'; console.log(`[DEBUG] Show screen: ${screenName}Screen`); } else { console.error(`Screen not found: ${screenName}Screen`); }
}
function shuffleArray(array) { /* ... function code ... */
    let newArr = [...array]; for (let i = newArr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[newArr[i], newArr[j]] = [newArr[j], newArr[i]]; } return newArr;
}
function simulateBotAnswer(question, accuracy) { /* ... function code ... */
    const getsItRight = Math.random() < accuracy; if (getsItRight) return { answer: question.answer, isCorrect: true }; if (!question || typeof question.answer === 'undefined') return { answer: "???", isCorrect: false }; // Safety check
    if (question.questionType === 'n') { const offset = Math.random() < 0.5 ? -1 : 1; let wrongAns = question.answer + (offset * (Math.floor(Math.random() * 3) + 1)); if (wrongAns === question.answer) wrongAns += offset; return { answer: wrongAns, isCorrect: false }; } else { const wrongOptions = (question.options || []).filter(opt => opt !== question.answer); if (wrongOptions.length === 0) return { answer: "???", isCorrect: false }; const botAns = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]; return { answer: botAns, isCorrect: false }; }
}

// --- S T A R T G A M E ---
// Wait for the DOM to be ready, then initialize the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
}
else {
    // DOMContentLoaded has already fired
    if (app && auth && db) {
        initApp();
    }
}