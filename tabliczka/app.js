/* ══════════════════════════════════════════
   Game class — state and logic
══════════════════════════════════════════ */
class Game {
  static FACTOR_MAX = 10; // czynniki zawsze 2–10

  constructor() {
    this.questions = [];
    this.wrongAnswers = [];
    this.index = 0;
    this.correct = 0;
    this.wrong = 0;
    this.total = 20;
    this.maxResult = 100;
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Returns all available questions filtered by maxResult and types.
   * types: Set containing 'multiply' and/or 'divide'
   */
  static availableQuestions(maxResult, types) {
    const questions = [];
    for (let a = 2; a <= Game.FACTOR_MAX; a++) {
      for (let b = 2; b <= Game.FACTOR_MAX; b++) {
        const product = a * b;
        if (product > maxResult) continue;

        if (types.has('multiply'))
          questions.push({ left: a, right: b, operator: '×', answer: product });
        if (types.has('divide'))
          questions.push({ left: product, right: b, operator: '÷', answer: a });
      }
    }
    return questions;
  }

  /** Generate `total` unique shuffled questions from the filtered pool */
  generateQuestions() {
    const pool = Game.availableQuestions(this.maxResult, this.types);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.questions = pool.slice(0, this.total);
  }

  start(total, maxResult, types) {
    this.maxResult = maxResult;
    this.types = types;
    const available = Game.availableQuestions(maxResult, types).length;
    this.total = Math.min(total, available);
    this.generateQuestions();
    this.index = 0;
    this.wrongAnswers = [];
    this.correct = 0;
    this.wrong = 0;
    this.startTime = Date.now();
    this.endTime = null;
  }

  get current() { return this.questions[this.index]; }
  get isFinished() { return this.index >= this.total; }
  get progress() { return this.index / this.total; }

  /** Submit an answer. Returns true if correct. */
  submit(value) {
    const { left, right, operator, answer } = this.current;
    const isCorrect = value === answer;
    if (isCorrect) {
      this.correct++;
    } else {
      this.wrong++;
      this.wrongAnswers.push({
        left,
        right,
        operator,
        userAnswer: value,
        correctAnswer: answer,
      });
    }

    this.index++;
    if (this.isFinished) this.endTime = Date.now();
    return isCorrect;
  }

  get elapsedSeconds() {
    const ms = (this.endTime || Date.now()) - this.startTime;
    return (ms / 1000).toFixed(1);
  }
}

/* ══════════════════════════════════════════
   UI helpers
══════════════════════════════════════════ */
const $ = id => document.getElementById(id);

function showScreen(name) {
  ['start', 'game', 'results'].forEach(s => {
    $(`screen-${s}`).classList.toggle('active', s === name);
  });
}

/* ══════════════════════════════════════════
   Controller
══════════════════════════════════════════ */
const game = new Game();
let waitingForNext = false; // true while showing feedback, before advancing

/* ── Settings persistence ── */
const LS = {
  maxResult: 'tabliczka_maxResult',
  total:     'tabliczka_total',
  multiply:  'tabliczka_multiply',
  divide:    'tabliczka_divide',
};

function saveSettings() {
  localStorage.setItem(LS.maxResult, $('cfg-max-result').value);
  localStorage.setItem(LS.total,     $('cfg-total').value);
  localStorage.setItem(LS.multiply,  $('cfg-multiply').checked);
  localStorage.setItem(LS.divide,    $('cfg-divide').checked);
}

function loadSettings() {
  const maxResult = localStorage.getItem(LS.maxResult);
  const total     = localStorage.getItem(LS.total);
  const multiply  = localStorage.getItem(LS.multiply);
  const divide    = localStorage.getItem(LS.divide);
  if (maxResult !== null) $('cfg-max-result').value   = maxResult;
  if (total     !== null) $('cfg-total').value        = total;
  if (multiply  !== null) $('cfg-multiply').checked   = multiply === 'true';
  if (divide    !== null) $('cfg-divide').checked     = divide   === 'true';
}

/* ── Settings helpers ── */
function getSettings() {
  const maxResult = Math.min(100, Math.max(10, parseInt($('cfg-max-result').value, 10) || 100));
  const total     = Math.min(50,  Math.max(5,  parseInt($('cfg-total').value,      10) || 20));
  const types = new Set();
  if ($('cfg-multiply').checked) types.add('multiply');
  if ($('cfg-divide').checked)   types.add('divide');
  return { maxResult, total, types };
}

function updatePairsHint() {
  const { maxResult, total, types } = getSettings();
  const noTypes = types.size === 0;
  $('type-error').classList.toggle('hidden', !noTypes);
  const available = noTypes ? 0 : Game.availableQuestions(maxResult, types).length;
  $('pairs-count').textContent = available;
  const totalInput = $('cfg-total');
  if (!noTypes && total > available) {
    totalInput.classList.add('invalid');
    $('pairs-hint').title = `Zmniejszono liczbę zadań do ${available}`;
  } else {
    totalInput.classList.remove('invalid');
    $('pairs-hint').title = '';
  }
}

$('cfg-max-result').addEventListener('input', () => { saveSettings(); updatePairsHint(); });
$('cfg-total').addEventListener('input', () => { saveSettings(); updatePairsHint(); });
$('cfg-multiply').addEventListener('change', () => { saveSettings(); updatePairsHint(); });
$('cfg-divide').addEventListener('change', () => { saveSettings(); updatePairsHint(); });
loadSettings();
updatePairsHint(); // init on load

function renderQuestion() {
  const { left, right, operator } = game.current;
  $('task-display').textContent = `${left} ${operator} ${right} = `;
  $('answer-input').value = '';
  $('answer-input').focus();
  hideFeedback();
  updateProgress();
}

function updateProgress() {
  const n = game.index + 1;
  $('progress-label').textContent = `Zadanie ${n} / ${game.total}`;
  $('progress-bar').style.width = `${game.progress * 100}%`;
}

function showFeedback(text, cls) {
  const el = $('feedback');
  el.textContent = text;
  el.className = `feedback ${cls}`;
}

function hideFeedback() {
  $('feedback').className = 'feedback hidden';
  $('feedback').textContent = '';
}

function renderWrongAnswers() {
  const review = $('results-review');
  const list = $('results-review-list');

  list.replaceChildren();

  if (game.wrongAnswers.length === 0) {
    review.hidden = true;
    return;
  }

  game.wrongAnswers.forEach(({ left, right, operator, userAnswer, correctAnswer }) => {
    const item = document.createElement('li');
    item.className = 'results-review-item';

    const task = document.createElement('p');
    task.className = 'results-review-task';
    task.textContent = `${left} ${operator} ${right}`;

    const detail = document.createElement('p');
    detail.className = 'results-review-detail';
    detail.textContent = `Twoja odpowiedź: ${userAnswer} • Poprawny wynik: ${correctAnswer}`;

    item.append(task, detail);
    list.appendChild(item);
  });

  review.hidden = false;
}

function handleAnswer() {
  if (waitingForNext) {
    advanceOrFinish();
    return;
  }

  const raw = $('answer-input').value.trim();
  if (raw === '') return;
  const value = parseInt(raw, 10);
  if (isNaN(value)) return;

  const { left, right, operator, answer } = game.current;
  const isCorrect = game.submit(value);

  if (isCorrect) {
    showFeedback('✅ Brawo! To dobra odpowiedź!', 'correct');
    $('task-display').classList.add('pop');
    setTimeout(() => $('task-display').classList.remove('pop'), 300);
  } else {
    showFeedback(`❌ Błąd! ${left} ${operator} ${right} = ${answer}`, 'wrong');
  }

  $('btn-check').textContent = game.isFinished ? '📊 Wyniki' : '➡ Dalej';
  waitingForNext = true;
}

function advanceOrFinish() {
  waitingForNext = false;
  $('btn-check').textContent = '✔ Sprawdź';
  if (game.isFinished) {
    showResults();
  } else {
    renderQuestion();
  }
}

function showResults() {
  const secs = parseFloat(game.elapsedSeconds);
  const timeStr = secs >= 60
    ? `${Math.floor(secs / 60)}m ${(secs % 60).toFixed(1)}s`
    : `${secs.toFixed(1)}s`;

  $('stat-time').textContent = timeStr;
  $('stat-correct').textContent = game.correct;
  $('stat-wrong').textContent = game.wrong;
  renderWrongAnswers();

  const pct = game.correct / game.total;
  let emoji = '🌟', msg = '';
  if (pct === 1)        { emoji = '🏆'; msg = 'Perfekcyjny wynik! Jesteś mistrzem!'; }
  else if (pct >= 0.8)  { emoji = '😊'; msg = 'Świetny wynik! Tak trzymaj!'; }
  else if (pct >= 0.5)  { emoji = '💪'; msg = 'Dobra robota! Ćwicz dalej!'; }
  else                  { emoji = '📚'; msg = 'Nie poddawaj się! Spróbuj jeszcze raz!'; }

  $('results-emoji').textContent = emoji;
  $('results-message').textContent = msg;
  showScreen('results');
}

/* ══════════════════════════════════════════
   Event listeners
══════════════════════════════════════════ */
$('btn-start').addEventListener('click', () => {
  const { maxResult, total, types } = getSettings();
  if (types.size === 0) return;
  game.start(total, maxResult, types);
  waitingForNext = false;
  $('btn-check').textContent = '✔ Sprawdź';
  showScreen('game');
  renderQuestion();
});

$('btn-check').addEventListener('click', handleAnswer);

$('answer-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAnswer();
});

$('btn-restart').addEventListener('click', () => {
  showScreen('start');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(error => {
      console.error('Rejestracja Service Workera nie powiodła się:', error);
    });
  });
}
