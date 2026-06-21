# 🥗 CalTrack — Calorie Tracker & Macro Dashboard

A full-stack daily food journal web app built for the **Quantiphi Vibe Coding Challenge (Set-A)**.

## ✨ Features

- **Daily Calorie Budget** — large progress bar that turns 🔴 crimson and fires a warning modal when exceeded
- **Macro Breakdown** — live progress meters for Protein, Carbs, and Fat
- **Food Logging** — manually enter food name + portion (grams); backend calculates all nutrients
- **Image Scan Simulation** — one-click mock AI scanner auto-fills the form with a predefined food
- **Meal History Grid** — lists every logged meal with per-item delete (🗑️) that instantly updates all bars
- **Fitness Goal Toggle** — switch between *Weight Loss*, *Maintenance*, and *Muscle Gain* to instantly recalibrate budgets without clearing logged meals

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Frontend | HTML + Vanilla CSS + Vanilla JS |
| State | In-memory (server-side) |
| Communication | REST API (JSON) |

## 🏗️ Architecture

> All business logic, nutrient calculations, budget validation, and state management live **exclusively on the backend**. The frontend only handles presentation and user input.

```
quantiphile/
├── server.js        # Express server — all logic here
├── package.json
└── public/
    ├── index.html   # Single-page UI
    ├── style.css    # Dark-mode design system
    └── app.js       # Fetch calls + DOM updates only
```

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

## 🔌 API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/state` | Full current state (meals, totals, budget, exceeded flag) |
| `POST` | `/api/meals` | Add a meal `{ name, grams }` |
| `DELETE` | `/api/meals/:id` | Remove a meal by ID |
| `PUT` | `/api/goal` | Update fitness goal `{ goal }` |
| `GET` | `/api/mock-scan` | Returns a random predefined food for scan simulation |

## 🧮 Nutrient Calculation Logic

Nutrients are calculated from a fixed **baseline per 100g**:

| Nutrient | Per 100g |
|---|---|
| Calories | 250 kcal |
| Protein | 15g |
| Carbs | 30g |
| Fat | 8g |

**Formula:** `value = baseline × (grams / 100)`

## 🎯 Fitness Goal Budgets

| Goal | Calories | Protein | Carbs | Fat |
|---|---|---|---|---|
| Weight Loss | 1600 kcal | 120g | 150g | 50g |
| Maintenance | 2000 kcal | 150g | 220g | 65g |
| Muscle Gain | 2500 kcal | 180g | 300g | 80g |
