const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('crypto');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── In-Memory State ────────────────────────────────────────────────────────
let state = {
  goal: 'maintenance',
  meals: [],
};

// ─── Budget Tables ───────────────────────────────────────────────────────────
const BUDGETS = {
  weight_loss:  { calories: 1600, protein: 120, carbs: 150, fat: 50 },
  maintenance:  { calories: 2000, protein: 150, carbs: 220, fat: 65 },
  muscle_gain:  { calories: 2500, protein: 180, carbs: 300, fat: 80 },
};

// ─── Nutrient Baseline (per 100g) ────────────────────────────────────────────
const BASELINE_PER_100G = {
  calories: 250, // kcal
  protein:  15,  // g
  carbs:    30,  // g
  fat:       8,  // g
};

// ─── Mock Scan Foods ─────────────────────────────────────────────────────────
const MOCK_FOODS = [
  { name: 'Grilled Chicken',  grams: 150 },
  { name: 'Brown Rice',       grams: 200 },
  { name: 'Boiled Eggs',      grams: 120 },
  { name: 'Greek Yogurt',     grams: 180 },
  { name: 'Oatmeal',          grams: 100 },
];

// ─── Helper: Calculate Nutrients ─────────────────────────────────────────────
function calculateNutrients(grams) {
  const factor = grams / 100;
  return {
    calories: parseFloat((BASELINE_PER_100G.calories * factor).toFixed(1)),
    protein:  parseFloat((BASELINE_PER_100G.protein  * factor).toFixed(1)),
    carbs:    parseFloat((BASELINE_PER_100G.carbs    * factor).toFixed(1)),
    fat:      parseFloat((BASELINE_PER_100G.fat      * factor).toFixed(1)),
  };
}

// ─── Helper: Compute Totals ───────────────────────────────────────────────────
function computeTotals() {
  return state.meals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories;
      acc.protein  += meal.protein;
      acc.carbs    += meal.carbs;
      acc.fat      += meal.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// ─── Helper: Build Full Response ─────────────────────────────────────────────
function buildResponse() {
  const budget = BUDGETS[state.goal];
  const totals = computeTotals();
  const exceeded = totals.calories > budget.calories;
  return {
    goal:     state.goal,
    meals:    state.meals,
    totals:   {
      calories: parseFloat(totals.calories.toFixed(1)),
      protein:  parseFloat(totals.protein.toFixed(1)),
      carbs:    parseFloat(totals.carbs.toFixed(1)),
      fat:      parseFloat(totals.fat.toFixed(1)),
    },
    budget,
    exceeded,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/state — full current state
app.get('/api/state', (req, res) => {
  res.json(buildResponse());
});

// POST /api/meals — add a meal
app.post('/api/meals', (req, res) => {
  const { name, grams } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Food name is required.' });
  }
  const g = parseFloat(grams);
  if (isNaN(g) || g <= 0) {
    return res.status(400).json({ error: 'Grams must be a positive number.' });
  }

  const nutrients = calculateNutrients(g);
  const meal = {
    id:   Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    grams: g,
    ...nutrients,
  };

  state.meals.push(meal);
  res.status(201).json(buildResponse());
});

// DELETE /api/meals/:id — remove a meal
app.delete('/api/meals/:id', (req, res) => {
  const { id } = req.params;
  const idx = state.meals.findIndex(m => m.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Meal not found.' });
  }
  state.meals.splice(idx, 1);
  res.json(buildResponse());
});

// PUT /api/goal — update fitness goal
app.put('/api/goal', (req, res) => {
  const { goal } = req.body;
  if (!BUDGETS[goal]) {
    return res.status(400).json({ error: 'Invalid goal. Use: weight_loss | maintenance | muscle_gain' });
  }
  state.goal = goal;
  res.json(buildResponse());
});

// GET /api/mock-scan — return a random pre-defined food
app.get('/api/mock-scan', (req, res) => {
  const food = MOCK_FOODS[Math.floor(Math.random() * MOCK_FOODS.length)];
  res.json(food);
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Calorie Tracker running at http://localhost:${PORT}`);
});
