# Uphar CRM

A modern Customer Relationship Management (CRM) system built with Next.js, TypeScript, and Supabase. This application is designed for pharmaceutical distributors to manage leads, Challans (invoices), and track agent performance efficiently.

## Features

### 📊 Dashboard
- **Overview**: Real-time statistics for leads and Challans.
- **Visual Analytics**: Interactive charts for lead distribution by district and status, and agent performance.
- **Pending Leads**: Quick view of all leads awaiting follow-up.

### 📝 Data Entry
- **Unified Form**: Single interface to create new leads and Challans simultaneously.
- **Real-time Validation**: Instant feedback on data integrity.
- **Smart Suggestions**: Auto-complete suggestions based on existing data.

### 👥 Leads Management
- **List View**: Comprehensive table of all leads with sorting and filtering.
- **Status Tracking**: Categorize leads into Active, Follow-up Required, Converted, etc.
- **Details Modal**: Quick view of a lead's complete information without leaving the page.

### 📋 Challan Records
- **Complete History**: View all issued Challans.
- **Details Modal**: View specific Challan details including items and transactions.
- **Print Support**: Generate physical copies of Challans.

### 👤 Authentication
- **Role-Based Access**: Secure login system with different dashboards for different user roles.
- **Auth Helpers**: Built-in Supabase functions for authentication flows.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Material Symbols](https://fonts.google.com/icons)
- **Data Viz**: [Recharts](https://recharts.org/)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)
- [Supabase Account](https://supabase.com/)

## Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd uphar-crm
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Configuration**:
    Create a `.env.local` file in the `app` directory with the following credentials (provided by Supabase):

    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

## Usage

### Development
Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Build
Build the application for production:

```bash
npm run build
```

### Production
Run the production build:

```bash
npm run start
```

## Project Structure

```
uphar-crm/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   ├── (app)/                # Main application routes (protected)
│   │   ├── dashboard/        # Dashboard
│   │   ├── leads/            # Leads Management
│   │   ├── records/          # Challan Records
│   │   └── data-entry/       # Data Entry
│   ├── (auth)/               # Authentication routes
│   │   ├── login/            # Login Page
│   │   └── callback/         # Auth Callback
│   └── middleware.ts         # Middleware for auth checks
├── src/
│   ├── lib/                  # Core Logic
│   │   ├── supabase/         # Supabase Client Initialization
│   │   └── types.ts          # TypeScript Types
│   └── components/           # Reusable Components
└── .env.local                # Environment variables
```

## License

This project is licensed under the MIT License.
