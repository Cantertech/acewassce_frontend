# AceWassce Student Portal

A high-fidelity, data-driven mock exam platform designed for WASSCE students. This frontend features a modern glassmorphism UI, real-time performance tracking, and an integrated AI analysis dashboard.

## ✨ Key Features
- **Modern UI/UX:** Dark-mode glassmorphism interface built with React and Tailwind CSS.
- **LaTeX Rendering:** Crystal-clear mathematical formulas and scientific notations.
- **Real-time Analytics:** Live student ranking, percentile calculation, and topic weakness analysis.
- **Guided Scanner Wizard:** Structured theory submission flow for handwritten answer sheets.
- **PWA Support:** Installable as a native app on iOS and Android for a seamless experience.

## 🚀 Deployment

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file with:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BACKEND_URL` (Pointer to the AI Engine)

3. **Build for Production:**
   ```bash
   npm run build
   ```

## 🛠 Tech Stack
- **Framework:** React + Vite
- **Styling:** Tailwind CSS / Lucide Icons
- **Backend-as-a-Service:** Supabase
- **Data Visualization:** Recharts
- **Deployment:** Vercel / Netlify
