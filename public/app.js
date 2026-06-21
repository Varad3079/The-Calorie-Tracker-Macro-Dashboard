/* ─── app.js — Frontend Presentation & API Communication Only ─────────────── */

const API = {
  getState:  ()        => fetch('/api/state').then(r => r.json()),
  addMeal:   (name, grams) => fetch('/api/meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, grams }),
  }).then(r => r.json()),
  deleteMeal: (id)     => fetch(`/api/meals/${id}`, { method: 'DELETE' }).then(r => r.json()),
  setGoal:   (goal)    => fetch('/api/goal', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal }),
  }).then(r => r.json()),
  mockScan:  ()        => fetch('/api/mock-scan').then(r => r.json()),
};

// ─── DOM References ───────────────────────────────────────────────────────────
const el = {
  // Calorie bar
  calConsumed:    document.getElementById('cal-consumed'),
  calBudget:      document.getElementById('cal-budget'),
  calPercentBadge:document.getElementById('cal-percent-badge'),
  calorieBarFill: document.getElementById('calorie-bar-fill'),
  calorieCard:    document.querySelector('.calorie-card'),

  // Macro bars
  protConsumed:   document.getElementById('prot-consumed'),
  protBudget:     document.getElementById('prot-budget'),
  protPct:        document.getElementById('prot-pct'),
  protBar:        document.getElementById('prot-bar'),

  carbsConsumed:  document.getElementById('carbs-consumed'),
  carbsBudget:    document.getElementById('carbs-budget'),
  carbsPct:       document.getElementById('carbs-pct'),
  carbsBar:       document.getElementById('carbs-bar'),

  fatConsumed:    document.getElementById('fat-consumed'),
  fatBudget:      document.getElementById('fat-budget'),
  fatPct:         document.getElementById('fat-pct'),
  fatBar:         document.getElementById('fat-bar'),

  // Goal buttons
  goalBtns:       document.querySelectorAll('.goal-btn'),

  // Log form
  foodNameInput:  document.getElementById('food-name-input'),
  foodGramsInput: document.getElementById('food-grams-input'),
  addFoodBtn:     document.getElementById('add-food-btn'),
  scanBtn:        document.getElementById('scan-btn'),
  formError:      document.getElementById('form-error'),

  // Meals
  mealsGrid:      document.getElementById('meals-grid'),
  mealsEmpty:     document.getElementById('meals-empty'),

  // Modal
  modalOverlay:   document.getElementById('modal-overlay'),
  modalCloseBtn:  document.getElementById('modal-close-btn'),
};

// ─── State: track whether modal has been shown for current overage ────────────
let modalShownForCurrentExceedance = false;

// ─── Render: Update all UI from server response ───────────────────────────────
function renderState(data) {
  const { totals, budget, meals, exceeded, goal } = data;

  // — Calorie bar —
  const calPct = Math.min((totals.calories / budget.calories) * 100, 100);
  el.calConsumed.textContent    = totals.calories;
  el.calBudget.textContent      = budget.calories;
  el.calorieBarFill.style.width = `${calPct}%`;
  el.calPercentBadge.textContent = `${Math.round((totals.calories / budget.calories) * 100)}%`;

  el.calorieBarFill.classList.toggle('exceeded', exceeded);
  el.calPercentBadge.classList.toggle('exceeded', exceeded);
  el.calorieCard.classList.toggle('exceeded', exceeded);

  // — Macro bars —
  renderMacroBar(totals.protein, budget.protein, el.protConsumed, el.protBudget, el.protPct, el.protBar);
  renderMacroBar(totals.carbs,   budget.carbs,   el.carbsConsumed, el.carbsBudget, el.carbsPct, el.carbsBar);
  renderMacroBar(totals.fat,     budget.fat,     el.fatConsumed,  el.fatBudget,  el.fatPct,  el.fatBar);

  // — Goal toggle —
  el.goalBtns.forEach(btn => {
    const isActive = btn.dataset.goal === goal;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive.toString());
  });

  // — Meals grid —
  renderMealsGrid(meals);

  // — Modal —
  if (exceeded && !modalShownForCurrentExceedance) {
    showModal();
    modalShownForCurrentExceedance = true;
  } else if (!exceeded) {
    modalShownForCurrentExceedance = false;
  }
}

function renderMacroBar(consumed, budget, elConsumed, elBudget, elPct, elBar) {
  const pct = Math.min((consumed / budget) * 100, 100);
  elConsumed.textContent = consumed;
  elBudget.textContent   = budget;
  elPct.textContent      = `${Math.round((consumed / budget) * 100)}%`;
  elBar.style.width      = `${pct}%`;
}

function renderMealsGrid(meals) {
  if (meals.length === 0) {
    el.mealsEmpty.classList.remove('hidden');
    el.mealsGrid.innerHTML = '';
    return;
  }
  el.mealsEmpty.classList.add('hidden');
  el.mealsGrid.innerHTML = meals.map(meal => `
    <div class="meal-row" id="meal-${meal.id}" role="listitem">
      <div>
        <div class="meal-name">${escapeHtml(meal.name)}</div>
        <div class="meal-grams">${meal.grams}g</div>
      </div>
      <div class="meal-macro macro-cal">
        <span class="meal-macro-val">${meal.calories}</span>
        <span class="meal-macro-lbl">kcal</span>
      </div>
      <div class="meal-macro macro-prot">
        <span class="meal-macro-val">${meal.protein}g</span>
        <span class="meal-macro-lbl">Protein</span>
      </div>
      <div class="meal-macro macro-carb">
        <span class="meal-macro-val">${meal.carbs}g</span>
        <span class="meal-macro-lbl">Carbs</span>
      </div>
      <div class="meal-macro macro-fat">
        <span class="meal-macro-val">${meal.fat}g</span>
        <span class="meal-macro-lbl">Fat</span>
      </div>
      <button
        class="delete-btn"
        data-id="${meal.id}"
        aria-label="Delete ${escapeHtml(meal.name)}"
        id="delete-${meal.id}"
        title="Remove meal"
      >🗑️</button>
    </div>
  `).join('');
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────
function showModal() {
  el.modalOverlay.classList.remove('hidden');
  el.modalCloseBtn.focus();
}
function hideModal() {
  el.modalOverlay.classList.add('hidden');
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showError(msg) {
  el.formError.textContent = msg;
  el.formError.classList.remove('hidden');
}
function clearError() {
  el.formError.classList.add('hidden');
  el.formError.textContent = '';
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.style.opacity = loading ? '0.6' : '1';
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

// Goal toggle
el.goalBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    const goal = btn.dataset.goal;
    try {
      const data = await API.setGoal(goal);
      renderState(data);
    } catch (e) {
      console.error('Failed to update goal', e);
    }
  });
});

// Add Food
el.addFoodBtn.addEventListener('click', async () => {
  clearError();
  const name  = el.foodNameInput.value.trim();
  const grams = parseFloat(el.foodGramsInput.value);

  if (!name)         { showError('Please enter a food name.'); return; }
  if (!grams || grams <= 0) { showError('Please enter a valid portion size in grams.'); return; }

  setLoading(el.addFoodBtn, true);
  try {
    const data = await API.addMeal(name, grams);
    if (data.error) { showError(data.error); return; }
    renderState(data);
    el.foodNameInput.value  = '';
    el.foodGramsInput.value = '';
    el.foodNameInput.focus();
  } catch (e) {
    showError('Failed to log meal. Please try again.');
  } finally {
    setLoading(el.addFoodBtn, false);
  }
});

// Allow Enter key on inputs to submit
[el.foodNameInput, el.foodGramsInput].forEach(input => {
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') el.addFoodBtn.click();
  });
});

// Scan Image
el.scanBtn.addEventListener('click', async () => {
  clearError();
  setLoading(el.scanBtn, true);
  try {
    const food = await API.mockScan();
    el.foodNameInput.value  = food.name;
    el.foodGramsInput.value = food.grams;
    el.foodNameInput.focus();
  } catch (e) {
    showError('Scan failed. Please enter food manually.');
  } finally {
    setLoading(el.scanBtn, false);
  }
});

// Delete Meal (event delegation on the grid)
el.mealsGrid.addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;
  const id  = btn.dataset.id;
  const row = document.getElementById(`meal-${id}`);
  if (row) { row.classList.add('removing'); }
  setTimeout(async () => {
    try {
      const data = await API.deleteMeal(id);
      renderState(data);
    } catch (err) {
      console.error('Delete failed', err);
      if (row) row.classList.remove('removing');
    }
  }, 280);
});

// Modal close
el.modalCloseBtn.addEventListener('click', hideModal);
el.modalOverlay.addEventListener('click', e => {
  if (e.target === el.modalOverlay) hideModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') hideModal();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const data = await API.getState();
    renderState(data);
  } catch (e) {
    console.error('Failed to load initial state', e);
  }
})();
