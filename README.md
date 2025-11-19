# Supabase Nexus Explorer (INF Platform 2.0)

A comprehensive recruitment event management platform for connecting students with companies during speed recruiting events. Built with React, TypeScript, Vite, and Supabase.

## 🎯 Purpose

This platform manages recruitment events where:
- **Students** can browse offers, book interview slots, and manage their profiles
- **Companies** can create offers, manage slots, and view scheduled interviews
- **Admins** can configure events, manage phases, verify companies, and monitor statistics

## 🚀 Features

### Core Functionality
- **Multi-Event Management** - Support for multiple recruitment events
- **Phased Booking System** - Two-phase booking with fairness controls
  - Phase 1: Priority students only (default: 3 bookings max)
  - Phase 2: All students (default: 6 bookings max)
- **Slot Capacity Management** - Multiple students per slot (default: 2)
- **Student Prioritization** - Admin-controlled deprioritized list
- **Company Verification** - Admin verification workflow
- **Quick Invite System** - One-step company invitation
- **Speed Recruiting Sessions** - Time-bounded interview sessions
- **Real-time Analytics** - Comprehensive statistics and monitoring

### User Roles
- **Students** - Browse offers, book slots, manage bookings
- **Companies** - Create offers, view bookings, manage slots
- **Admins** - Full system management and configuration

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Routing**: React Router v7
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Icons**: Lucide React

## 📁 Project Structure

```
supabase-nexus-explorer/
├── src/
│   ├── components/          # React components
│   │   ├── admin/          # Admin-specific components
│   │   │   ├── dashboard/  # Admin dashboard components
│   │   │   └── BulkImportModal.tsx
│   │   ├── company/        # Company-specific components
│   │   │   └── dashboard/  # Company dashboard components
│   │   └── shared/         # Shared/reusable components
│   │       └── LoadingScreen.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useEvents.ts
│   │   ├── useEventStats.ts
│   │   ├── useCompanyStats.ts
│   │   └── useCompanyEvents.ts
│   ├── lib/                # Library configurations
│   │   └── supabase.ts     # Supabase client
│   ├── pages/              # Page components (routes)
│   │   ├── admin/         # Admin pages
│   │   ├── company/       # Company pages
│   │   ├── student/       # Student pages
│   │   └── ...            # Auth and public pages
│   ├── types/              # TypeScript type definitions
│   │   ├── database.ts    # Database types
│   │   └── index.ts       # Type exports
│   ├── utils/              # Utility functions
│   │   ├── dateUtils.ts   # Date formatting
│   │   └── constants.ts   # App constants
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── supabase/               # Supabase configuration
│   ├── migrations/        # Database migrations (47 files)
│   └── config.toml        # Supabase config
├── scripts/                # Utility scripts
└── package.json
```

## 🏗️ Architecture

### Component Organization
- **Pages** (`src/pages/`) - Top-level route components
- **Components** (`src/components/`) - Reusable UI components organized by feature
- **Hooks** (`src/hooks/`) - Custom hooks for data fetching and state management
- **Utils** (`src/utils/`) - Pure utility functions

### Database Schema
Key tables:
- `profiles` - User profiles (extends Supabase auth.users)
- `companies` - Company information and verification
- `events` - Event configurations
- `offers` - Job/internship offers
- `event_slots` - Interview time slots
- `bookings` - Student slot reservations
- `speed_recruiting_sessions` - Time-bounded sessions
- `event_participants` - Company-event relationships
- `event_registrations` - Student-event registrations

### Security
- **Row Level Security (RLS)** - All tables protected
- **Role-based access** - Policies based on user roles
- **Security definer functions** - Controlled database operations
- **Anti-spam protection** - Rate limiting and IP tracking

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd supabase-nexus-explorer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run all migrations in `supabase/migrations/` in order
   - Get your project URL and anon key

4. **Configure environment variables**
   Create a `.env` file in the root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to `http://localhost:8080`

### Database Setup

1. **Run migrations**
   ```bash
   # Using Supabase CLI (recommended)
   supabase db push
   
   # Or manually run each migration file in order
   ```

2. **Seed data (optional)**
   Check `supabase/migrations/20251101000003_seed_data.sql` for seed data

## 📚 Key Concepts

### Booking Phases
- **Phase 0**: Closed - No bookings allowed
- **Phase 1**: Priority Phase - Only non-deprioritized students can book (default: 3 max)
- **Phase 2**: Open Phase - All students can book (default: 6 max)

### Slot Capacity
Each slot can accommodate multiple students (default: 2). This allows for group interviews or parallel sessions.

### Student Prioritization
Admins can mark students as "deprioritized" which prevents them from booking during Phase 1, ensuring fairness for priority students.

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Tailwind CSS for styling
- JSDoc comments for documentation

### Adding New Features
1. Create components in appropriate `components/` subdirectory
2. Add custom hooks in `hooks/` for data fetching
3. Add utility functions in `utils/` for reusable logic
4. Update types in `types/` as needed
5. Add routes in `App.tsx` if needed

## 🗄️ Database Functions

Key database functions (in `supabase/migrations/`):
- `fn_book_interview()` - Main booking function with validations
- `fn_check_student_booking_limit()` - Phase-based limit checking
- `fn_check_slot_availability()` - Capacity checking
- `fn_cancel_booking()` - Booking cancellation
- `quick_invite_company()` - One-step company invitation
- `fn_generate_slots_for_session()` - Automatic slot generation

## 📖 Documentation

### Component Documentation
All components include JSDoc comments with:
- Component purpose
- Props interface
- Usage examples

### Hook Documentation
Custom hooks are documented with:
- Purpose and functionality
- Parameters and return values
- Usage examples

## 🤝 Contributing

1. Follow the existing code structure
2. Add JSDoc comments to new components/functions
3. Keep components small and focused
4. Use TypeScript types throughout
5. Test your changes thoroughly

## 📝 License

See LICENSE file for details.

## 🆘 Support

For issues or questions:
1. Check existing documentation
2. Review database migrations for schema changes
3. Check Supabase logs for backend errors
4. Review component JSDoc comments

## 🔄 Recent Changes

- Removed Next.js frontend (using React + Vite only)
- Split large dashboard components into smaller, focused components
- Extracted reusable logic into custom hooks
- Added comprehensive JSDoc documentation
- Organized project structure with clear separation of concerns
- Added utility functions for date formatting and constants
