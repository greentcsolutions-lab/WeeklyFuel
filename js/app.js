// ── WeeklyFuel ────────────────────────────────────────────────
// Weekly calorie / budget tracker — client-side, localStorage only

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

let state = {
  mode:         'calories',
  weeklyBudget: 14000,
  theme:        'dark',
  viewOffset:   0,
  entries:      {},
  selectedDay:  null,
};

const MODE_CONFIG = {
  calories: { unit: 'kcal', label: 'Calories', icon: '🔥', placeholder: 'e.g. 1800', defaultBudget: 14000, modalSub: 'How many calories do you want for the full week?' },
  budget:   { unit: '$',   label: 'Budget',   icon: '💵', placeholder: 'e.g. 150',  defaultBudget: 700,   modalSub: "What's your total spending budget for the week?" },
};

// ── Persistence ──────────────────────────────────────────────
function save() {
  localStorage.setItem('weeklyfuel_state', JSON.stringify(state));
}
function load() {
  try {
    const raw = localStorage.getItem('weeklyfuel_state');
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch(_) {}
}

// ── Week helpers ─────────────────────────────────────────────
function getWeekKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
}

function getWeekStart(offset = 0) {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day + offset * 7);
  d.setHours(0,0,0,0);
  return d;
}

function getEntryKey(weekKey, dayIndex) {
  return `${weekKey}-${dayIndex}`;
}

function todayDayIndex() {
  return new Date().getDay();
}

// ── Computed ─────────────────────────────────────────────────
function getWeekTotals(weekKey) {
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const e = state.entries[getEntryKey(weekKey, i)];
    if (e) total += e.amount;
  }
  return total;
}

function getLoggedDaysCount(weekKey) {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (state.entries[getEntryKey(weekKey, i)]) count++;
  }
  return count;
}

// ── Render ───────────────────────────────────────────────────
function render() {
  const cfg           = MODE_CONFIG[state.mode];
  const weekKey       = getWeekKey(state.viewOffset);
  const isCurrentWeek = state.viewOffset === 0;
  const todayIdx      = todayDayIndex();

  const total     = getWeekTotals(weekKey);
  const budget    = state.weeklyBudget;
  const pct       = Math.min((total / budget) * 100, 100);
  const over      = total > budget;
  const remaining = Math.max(budget - total, 0);

  document.getElementById('budgetDisplay').textContent = budget.toLocaleString();
  document.getElementById('unitLabel').textContent     = cfg.unit;

  const bar = document.getElementById('progressBar');
  bar.style.width = pct + '%';
  bar.className   = 'h-full rounded-full transition-all duration-700 ease-out progress-bar-fill' + (over ? ' progress-bar-over' : '');

  document.getElementById('usedLabel').textContent      = `${total.toLocaleString()} ${cfg.unit} used`;
  document.getElementById('remainingLabel').textContent = over
    ? `${(total - budget).toLocaleString()} ${cfg.unit} over!`
    : `${remaining.toLocaleString()} remaining`;

  const loggedDays     = getLoggedDaysCount(weekKey);
  const daysLeftInWeek = isCurrentWeek ? 7 - todayIdx : (state.viewOffset < 0 ? 0 : 7);

  document.getElementById('dailyAvg').textContent     = loggedDays > 0 ? Math.round(total / loggedDays).toLocaleString() : '—';
  document.getElementById('daysLeft').textContent     = isCurrentWeek ? `${daysLeftInWeek}d` : (state.viewOffset < 0 ? 'Done' : '7d');
  document.getElementById('budgetPerDay').textContent = daysLeftInWeek > 0 && isCurrentWeek ? Math.round(remaining / daysLeftInWeek).toLocaleString() : '—';

  const ws  = getWeekStart(state.viewOffset);
  const we  = new Date(ws); we.setDate(we.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  document.getElementById('weekLabel').textContent = `${fmt(ws)} – ${fmt(we)}`;

  renderDaysGrid(weekKey, isCurrentWeek, todayIdx);
  renderDayPicker(weekKey, isCurrentWeek, todayIdx);
  renderLogList(weekKey);

  document.getElementById('modeIcon').textContent       = cfg.icon;
  document.getElementById('modeLabel').textContent      = cfg.label;
  document.getElementById('amountLabel').textContent    = `Amount (${cfg.unit})`;
  document.getElementById('amountInput').placeholder    = cfg.placeholder;
  document.getElementById('modalSubtitle').textContent  = cfg.modalSub;
}

function renderDaysGrid(weekKey, isCurrentWeek, todayIdx) {
  const grid = document.getElementById('daysGrid');
  grid.innerHTML = '';
  const ws = getWeekStart(state.viewOffset);

  for (let i = 0; i < 7; i++) {
    const d        = new Date(ws); d.setDate(d.getDate() + i);
    const entry    = state.entries[getEntryKey(weekKey, i)];
    const isToday  = isCurrentWeek && i === todayIdx;
    const isFuture = isCurrentWeek && i > todayIdx;
    const isSel    = state.selectedDay === i;

    const card = document.createElement('div');
    card.className = `day-card bg-dark-700 ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''} ${isSel ? 'selected' : ''} ${entry ? 'has-entry' : ''}`;
    card.innerHTML = `
      <span class="text-xs font-medium text-slate-500">${DAY_NAMES[i]}</span>
      <span class="text-base font-display ${isToday ? 'text-fuel-400' : 'text-white'}">${d.getDate()}</span>
      <div class="day-dot"></div>
    `;

    if (!isFuture || !isCurrentWeek) {
      card.addEventListener('click', () => {
        state.selectedDay = i;
        save();
        render();
        if (entry) document.getElementById('amountInput').value = entry.amount;
      });
    }
    grid.appendChild(card);
  }
}

function renderDayPicker(weekKey, isCurrentWeek, todayIdx) {
  const picker = document.getElementById('dayPicker');
  picker.innerHTML = '';
  const ws = getWeekStart(state.viewOffset);

  for (let i = 0; i < 7; i++) {
    if (isCurrentWeek && i > todayIdx) continue;
    const d     = new Date(ws); d.setDate(d.getDate() + i);
    const entry = state.entries[getEntryKey(weekKey, i)];
    const isSel = state.selectedDay === i;

    const btn = document.createElement('button');
    btn.className = `px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
      isSel ? 'bg-fuel-500 text-white' : 'bg-dark-700 text-slate-400 hover:text-white hover:bg-dark-600'
    } ${entry ? 'ring-1 ring-fuel-500/30' : ''}`;
    btn.textContent = `${DAY_NAMES[i]} ${d.getDate()}${entry ? ' ✓' : ''}`;
    btn.addEventListener('click', () => {
      state.selectedDay = i;
      save();
      render();
      if (entry) document.getElementById('amountInput').value = entry.amount;
    });
    picker.appendChild(btn);
  }

  if (state.selectedDay === null && isCurrentWeek) {
    state.selectedDay = todayIdx;
    render();
  }
}

function renderLogList(weekKey) {
  const list  = document.getElementById('logList');
  const empty = document.getElementById('emptyState');
  const cfg   = MODE_CONFIG[state.mode];
  const ws    = getWeekStart(state.viewOffset);

  list.innerHTML = '';

  const entries = [];
  for (let i = 0; i < 7; i++) {
    const e = state.entries[getEntryKey(weekKey, i)];
    if (e) entries.push({ dayIndex: i, ...e });
  }

  if (entries.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  entries.reverse().forEach(e => {
    const d    = new Date(ws); d.setDate(d.getDate() + e.dayIndex);
    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-fuel-500/10 flex items-center justify-center text-fuel-400 text-sm font-display">
          ${e.dayIndex === todayDayIndex() && state.viewOffset === 0 ? '●' : d.getDate()}
        </div>
        <div>
          <p class="text-sm font-medium text-white">${DAY_FULL[e.dayIndex]}</p>
          ${e.note ? `<p class="text-xs text-slate-500">${e.note}</p>` : ''}
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="font-display text-lg text-white">${e.amount.toLocaleString()} <span class="text-xs text-slate-500">${cfg.unit}</span></span>
        <button class="delete-btn text-slate-600 hover:text-red-400 transition-colors text-xs" data-day="${e.dayIndex}">✕</button>
      </div>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const dayIndex = parseInt(ev.currentTarget.dataset.day);
      delete state.entries[getEntryKey(weekKey, dayIndex)];
      save();
      render();
      toast('Entry removed', '🗑️');
    });
  });
}

// ── Toast ────────────────────────────────────────────────────
let toastTimer;
function toast(msg, icon = '✓') {
  const el    = document.getElementById('toastInner');
  const msgEl = document.getElementById('toastMsg');
  const icEl  = document.getElementById('toastIcon');
  msgEl.textContent = msg;
  icEl.textContent  = icon;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ── Event listeners ──────────────────────────────────────────
document.getElementById('logBtn').addEventListener('click', () => {
  const weekKey = getWeekKey(state.viewOffset);
  const input   = document.getElementById('amountInput');
  const note    = document.getElementById('noteInput').value.trim();
  const amount  = parseFloat(input.value);

  if (!amount || amount <= 0) {
    input.classList.add('border-red-500/50');
    setTimeout(() => input.classList.remove('border-red-500/50'), 1200);
    return;
  }
  if (state.selectedDay === null) { toast('Select a day first!', '📅'); return; }

  state.entries[getEntryKey(weekKey, state.selectedDay)] = { amount, note };
  save();
  render();

  input.value = '';
  document.getElementById('noteInput').value = '';

  const btn = document.getElementById('logBtn');
  btn.classList.add('pulse-success');
  setTimeout(() => btn.classList.remove('pulse-success'), 700);
  toast('Entry saved!', '🔥');
});

document.getElementById('editBudgetBtn').addEventListener('click', () => {
  document.getElementById('budgetInput').value = state.weeklyBudget;
  document.getElementById('budgetModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('budgetInput').focus(), 50);
});
document.getElementById('cancelBudgetBtn').addEventListener('click', () => {
  document.getElementById('budgetModal').classList.add('hidden');
});
document.getElementById('modalOverlay').addEventListener('click', () => {
  document.getElementById('budgetModal').classList.add('hidden');
});
document.getElementById('saveBudgetBtn').addEventListener('click', () => {
  const val = parseFloat(document.getElementById('budgetInput').value);
  if (!val || val <= 0) return;
  state.weeklyBudget = val;
  save();
  render();
  document.getElementById('budgetModal').classList.add('hidden');
  toast('Budget updated!', '✓');
});
document.getElementById('budgetInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('saveBudgetBtn').click();
});

document.getElementById('modeToggle').addEventListener('click', () => {
  state.mode         = state.mode === 'calories' ? 'budget' : 'calories';
  state.weeklyBudget = MODE_CONFIG[state.mode].defaultBudget;
  save();
  render();
  toast(`Switched to ${MODE_CONFIG[state.mode].label} mode`, MODE_CONFIG[state.mode].icon);
});

document.getElementById('themeToggle').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.classList.toggle('dark',  state.theme === 'dark');
  document.documentElement.classList.toggle('light', state.theme === 'light');
  document.getElementById('themeToggle').textContent = state.theme === 'dark' ? '🌙' : '☀️';
  save();
});

document.getElementById('prevWeekBtn').addEventListener('click', () => {
  state.viewOffset--;
  save();
  render();
});
document.getElementById('nextWeekBtn').addEventListener('click', () => {
  if (state.viewOffset < 0) { state.viewOffset++; save(); render(); }
});

document.getElementById('clearWeekBtn').addEventListener('click', () => {
  if (!confirm('Clear all entries for this week?')) return;
  const weekKey = getWeekKey(state.viewOffset);
  for (let i = 0; i < 7; i++) delete state.entries[getEntryKey(weekKey, i)];
  save();
  render();
  toast('Week cleared', '🗑️');
});

// ── Init ─────────────────────────────────────────────────────
load();
document.documentElement.classList.toggle('dark',  state.theme === 'dark');
document.documentElement.classList.toggle('light', state.theme === 'light');
document.getElementById('themeToggle').textContent = state.theme === 'dark' ? '🌙' : '☀️';
render();
