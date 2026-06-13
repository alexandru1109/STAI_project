News Generator Frontend
Next.js frontend interface for the News Generator text generation system.
The app connects to a FastAPI backend, sends generation requests, displays generated text, and keeps conversations locally in the browser.
---
Features
Text generation interface
Multiple conversations
Local conversation history
Continue generation from a previous result
Adjustable generation controls
Preset parameter modes
Backend health status
Backend sync / preload action
Result metrics
Copy generated text
Copy only the generated continuation
Rerun previous prompts
Delete generated results
Rename conversations
Delete conversations
Responsive layout
---
Tech Stack
Next.js
React
TypeScript
CSS Modules / global CSS
Browser local storage
FastAPI backend proxy routes
---
Project Structure
```text
frontend/
├── app/
│   ├── api/
│   │   ├── generate/
│   │   ├── health/
│   │   └── load/
│   ├── conversations/
│   │   └── [conversationId]/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
├── types/
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── next-env.d.ts
├── .env.example
└── README.md
```
---
Requirements
Use a stable Node.js version.
Recommended:
```bash
node -v
```
Expected:
```text
Node.js 22.x or newer stable LTS version
```
Install dependencies with:
```bash
npm install
```
---
Environment Variables
Create a local environment file:
```bash
cp .env.example .env.local
```
Set the FastAPI backend URL:
```env
FASTAPI_BASE_URL=http://localhost:8000
```
The frontend calls its own internal API routes, and those routes forward requests to the backend.
---
Running the Frontend
Start the development server:
```bash
npm run dev
```
Open the app:
```text
http://localhost:3000
```
---
Backend Connection
The frontend expects the backend to be running at the URL configured in:
```env
FASTAPI_BASE_URL
```
Default backend URL:
```text
http://localhost:8000
```
The backend should expose:
```text
GET  /health
POST /load
POST /generate
```
The frontend uses local proxy routes:
```text
/api/health
/api/load
/api/generate
```
---
Available Scripts
Development
```bash
npm run dev
```
Starts the Next.js development server.
Production Build
```bash
npm run build
```
Creates a production build.
Production Start
```bash
npm run start
```
Runs the production build.
Lint
```bash
npm run lint
```
Runs linting checks.
---
Conversations
The app supports multiple conversations.
Each conversation contains:
title
prompt
selected generation parameters
generated results
timestamps
result metrics
Conversation data is stored locally in the browser.
No database is required for the current version.
---
Generation Controls
The sidebar contains the main generation controls.
Max New Tokens
Controls how many tokens the model can generate after the prompt.
Temperature
Controls output variation.
Lower values make the output more predictable. Higher values allow more variation.
Top-K
Limits sampling to the most likely next-token candidates.
Repetition Penalty
Discourages repeated phrasing.
A value of `1.0` turns this off.
---
Presets
The app includes parameter presets:
```text
Creative
Balanced
Focused
Conservative
```
Selecting a preset updates the generation controls.
---
Result Actions
Each generated result supports:
copy full text
copy continuation
continue from this result
rerun
delete
Result details are available inside the result card.
---
Local Storage
The app stores conversations in browser local storage.
This allows conversations to remain available after refreshing or reopening the page.
Clearing browser storage for `localhost:3000` will remove saved conversations.
---

Setup Summary
From the `frontend` folder:
```bash
npm install
cp .env.example .env.local
npm run dev
```
Then open:
```text
http://localhost:3000
```
