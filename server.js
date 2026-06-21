require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Gemini Setup ─────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel(
  { model: 'gemini-1.5-flash' },
  { apiVersion: 'v1' }
);

// ─── In-Memory State ──────────────────────────────────────────────────────────
let state = {
  goal: 'maintenance',
  meals: [],
};

// ─── Budget Tables ────────────────────────────────────────────────────────────
const BUDGETS = {
  weight_loss:  { calories: 1600, protein: 120, carbs: 150, fat: 50 },
  maintenance:  { calories: 2000, protein: 150, carbs: 220, fat: 65 },
  muscle_gain:  { calories: 2500, protein: 180, carbs: 300, fat: 80 },
};

// ─── Mock Scan Foods ──────────────────────────────────────────────────────────
const MOCK_FOODS = [
  { name: 'Grilled Chicken',  grams: 150 },
  { name: 'Brown Rice',       grams: 200 },
  { name: 'Boiled Eggs',      grams: 120 },
  { name: 'Greek Yogurt',     grams: 180 },
  { name: 'Oatmeal',          grams: 100 },
];

// ─── Fallback Baseline (per 100g) ─────────────────────────────────────────────
const BASELINE_PER_100G = { calories: 250, protein: 15, carbs: 30, fat: 8 };

function fallbackNutrients(grams) {
  const f = grams / 100;
  return {
    calories: parseFloat((BASELINE_PER_100G.calories * f).toFixed(1)),
    protein:  parseFloat((BASELINE_PER_100G.protein  * f).toFixed(1)),
    carbs:    parseFloat((BASELINE_PER_100G.carbs    * f).toFixed(1)),
    fat:      parseFloat((BASELINE_PER_100G.fat      * f).toFixed(1)),
    source:   'estimate',
  };
}

// ─── Gemini Nutrition Lookup ──────────────────────────────────────────────────
async function getNutrientsFromGemini(name, grams) {
  const prompt = `You are a precise nutrition database. Given a food item and its weight, return ONLY a valid JSON object with nutritional values. No markdown, no explanation, no code blocks — just raw JSON.

Food: ${name}
Weight: ${grams}g

Respond with ONLY this exact JSON structure:
{"calories": <number>, "protein": <number>, "carbs": <number>, "fat": <number>}

Rules:
- calories = total kcal for the given weight
- protein, carbs, fat = grams for the given weight
- All values must be positive numbers rounded to 1 decimal place
- Base your answer on standard nutritional data for this food`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip any accidental markdown fences
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate the response has all required fields
    const { calories, protein, carbs, fat } = parsed;
    if (
      typeof calories === 'number' && typeof protein === 'number' &&
      typeof carbs   === 'number' && typeof fat     === 'number'
    ) {
      return {
        calories: parseFloat(calories.toFixed(1)),
        protein:  parseFloat(protein.toFixed(1)),
        carbs:    parseFloat(carbs.toFixed(1)),
        fat:      parseFloat(fat.toFixed(1)),
        source:   'gemini',
      };
    }
    throw new Error('Invalid response structure from Gemini');
  } catch (err) {
    console.warn(`[Gemini] Failed for "${name}" ${grams}g — using fallback. Error: ${err.message}`);
    return fallbackNutrients(grams);
  }
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

// ─── Helper: Build Full Response ──────────────────────────────────────────────
function buildResponse() {
  const budget = BUDGETS[state.goal];
  const totals = computeTotals();
  const exceeded = totals.calories > budget.calories;
  return {
    goal:   state.goal,
    meals:  state.meals,
    totals: {
      calories: parseFloat(totals.calories.toFixed(1)),
      protein:  parseFloat(totals.protein.toFixed(1)),
      carbs:    parseFloat(totals.carbs.toFixed(1)),
      fat:      parseFloat(totals.fat.toFixed(1)),
    },
    budget,
    exceeded,
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/state
app.get('/api/state', (req, res) => {
  res.json(buildResponse());
});

// POST /api/meals — Gemini-powered nutrient lookup
app.post('/api/meals', async (req, res) => {
  const { name, grams } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Food name is required.' });
  }
  const g = parseFloat(grams);
  if (isNaN(g) || g <= 0) {
    return res.status(400).json({ error: 'Grams must be a positive number.' });
  }

  // Call Gemini for real nutrition data (falls back to baseline on failure)
  const nutrients = await getNutrientsFromGemini(name.trim(), g);

  const meal = {
    id:    Math.random().toString(36).substr(2, 9),
    name:  name.trim(),
    grams: g,
    calories: nutrients.calories,
    protein:  nutrients.protein,
    carbs:    nutrients.carbs,
    fat:      nutrients.fat,
    source:   nutrients.source,   // 'gemini' or 'estimate'
  };

  state.meals.push(meal);
  res.status(201).json(buildResponse());
});

// DELETE /api/meals/:id
app.delete('/api/meals/:id', (req, res) => {
  const { id } = req.params;
  const idx = state.meals.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Meal not found.' });
  state.meals.splice(idx, 1);
  res.json(buildResponse());
});

// PUT /api/goal
app.put('/api/goal', (req, res) => {
  const { goal } = req.body;
  if (!BUDGETS[goal]) {
    return res.status(400).json({ error: 'Invalid goal. Use: weight_loss | maintenance | muscle_gain' });
  }
  state.goal = goal;
  res.json(buildResponse());
});

// GET /api/mock-scan
app.get('/api/mock-scan', (req, res) => {
  const food = MOCK_FOODS[Math.floor(Math.random() * MOCK_FOODS.length)];
  res.json(food);
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`CalTrack running at http://localhost:${PORT}`);
  console.log(`Gemini API: ${process.env.GEMINI_API_KEY ? '✅ Connected' : '⚠️  Not configured (using fallback)'}`);
});
