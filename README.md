# CureSense — AI Treatment Intelligence

CureSense is a production-ready, scalable SaaS hospital AI platform designed for advanced clinical decision support, real-time patient monitoring, and intelligent treatment management.

## 🚀 Features

- **Role-Based Access**: Specialized dashboards for Doctors, Nurses, Patients, and Hospital Admins.
- **AI-Powered Analytics**: Predictive risk assessment for treatment failure, readmission, and side effects.
- **Real-Time Monitoring**: Live vital sign tracking and critical alert system.
- **Audit Logging**: Comprehensive traceability for all clinical actions.
- **Mobile Accident Detection**: Edge-simulated emergency detection with multi-sensor fusion.
- **Secure Architecture**: Built on Supabase with robust authentication and RLS.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/alwinjosegeorge/Curesense.git
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_key
   ```

4. Start development server:
   ```sh
   npm run dev
   ```

## 🏗️ Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion.
- **Backend/DB**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime).
- **AI**: Google Gemini via Supabase Edge Functions.

## 🏥 Module Overview

- **/doctor**: Treatment planning, AI risk analysis, and case reporting.
- **/nurse**: Vitals recording and patient observation.
- **/admin**: Admissions and hospital-wide statistics.
- **/patient**: Personal health record access and symptom tracking.
- **/mobile-demo**: Accident detection simulation.
