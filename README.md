# Smile Dental Clinic — Staff Dashboard

A mobile-first staff dashboard for dental clinic management, powered by React + Supabase. Includes AI receptionist integration via n8n and WhatsApp automation for appointment booking.

## Features

- **Overview** — live stats: today's appointments, active patients, upcoming bookings
- **Calendar** — appointment scheduler with per-dentist filtering
- **Patients** — patient records and AI call logs from the receptionist bot
- **Clinic**
  - Dentists — manage staff accounts, specialties, and roles
  - Services & Prices — dental service menu with pricing
- **Settings**
  - Clinic Info — name, address, phone, about
  - Opening Hours — set open/closed times per day with toggle switches
  - Automation Health — monitor n8n workflow and AI receptionist status
- Role-based access (Admin vs Dentist)
- Mobile-optimised — bottom tab navigation on phones
- Dark theme with teal accent

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Styling | Pure CSS (no UI library) |
| Automation | n8n + WhatsApp |
| Deployment | Vercel |

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/faizan-s17/Dental_Dashboard.git
cd Dental_Dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set environment variables

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these in your Supabase project → **Settings → API**.

### 4. Run locally

```bash
npm run dev
```

## Supabase Tables Required

| Table | Purpose |
|---|---|
| `dental_dentists` | Staff profiles and roles |
| `dental_clinic_config` | Clinic name, address, opening hours |
| `dental_appointments` | Bookings with date, time, service, dentist |
| `dental_services` | Service name and price list |
| `dental_patients` | Patient records |
| `dental_call_logs` | AI receptionist call history |

## Deployment (Vercel)

1. Import this repo on [vercel.com](https://vercel.com)
2. Framework: **Vite** (auto-detected)
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

## Login

Staff must be invited via Supabase Auth (Authentication → Users → Invite user). Their email must also exist in the `dental_dentists` table — the dashboard links the auth user to the dentist profile automatically on first sign-in.
