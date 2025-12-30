# SAIF CRM

A modern CRM application for managing VC fund applications, deliberations, and portfolio investments.

## Features

- **Pipeline Management**: Track incoming applications through a voting workflow
- **Deliberation**: Make final investment decisions with full partner vote visibility
- **Portfolio Tracking**: Monitor investments with activity charts and detailed records
- **JotForm Integration**: Automatic application intake via webhook

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Styling**: Tailwind CSS v4
- **Auth**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in your Supabase credentials in `.env.local`

5. Run the development server:
   ```bash
   npm run dev
   ```

### JotForm Webhook Setup

1. In JotForm, go to your form's Settings > Integrations > Webhooks
2. Add a new webhook with the URL:
   ```
   https://your-domain.com/api/webhook/jotform?secret=YOUR_WEBHOOK_SECRET
   ```
3. Set `WEBHOOK_SECRET` in your environment variables to match

## Database Schema

The application uses the following main tables:

- `users` - Partner accounts
- `applications` - Incoming company applications
- `votes` - Partner votes on applications
- `deliberations` - Final decision records
- `investments` - Portfolio company records

## Deployment

The application is configured for deployment on Vercel:

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

## License

Private - SAIF Partners
