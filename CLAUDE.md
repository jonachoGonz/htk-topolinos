# HTK-Center Topolinos - MVP Development Guide

## 🎯 Project Overview

PWA para centro de entrenamiento integral con gestión de:
- Profesionales (Kinesiólogos, Nutricionistas, Terapeutas)
- Estudiantes/Alumnos
- Planes de entrenamiento y pagos
- Disponibilidad y bookings

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite
- Backend: Express.js + Node.js
- Database: Supabase (PostgreSQL)
- UI: Radix UI + Tailwind CSS
- Auth: Supabase Auth
- Hosting: Netlify

---

## 📊 Development Workflow

### Branch Strategy

```
main                           (production-ready, stable)
  ├── develop                  (integration branch)
  │   ├── feature/phase-1-supabase-schema
  │   ├── feature/phase-2-teacher-dashboard
  │   ├── feature/phase-3-student-dashboard
  │   └── feature/phase-4-critical-features
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make commits with clear messages
3. Push to origin
4. Create PR on GitHub (request review)
5. Once approved, merge to `develop`
6. Merge `develop` → `main` when phase is complete

### Commit Message Format

```
type(scope): description

body (optional)
footer (optional)
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `style`, `chore`

Example:
```
feat(supabase): add availability schema and RLS policies

- Create availability table with weekly schedule
- Add professional_id foreign key
- Configure RLS for role-based access
- Add indexes for query performance

Relates to: Phase 1
```

---

## 🔐 Environment Variables

**Required .env:**
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3000
```

Store in `.env` (locally, don't commit to git)

---

## 🚀 Running the Project

```bash
# Install dependencies
pnpm install

# Development mode (Vite dev server)
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm run start

# Type checking
pnpm run typecheck

# Format code
pnpm run format.fix

# Run tests
pnpm run test
```

---

## 📁 Project Structure

```
htk-topolinos/
├── client/                      # React frontend
│   ├── pages/                   # Route pages
│   ├── components/
│   │   ├── ui/                 # Shadcn UI components
│   │   ├── dashboard/          # Dashboard shared components
│   │   └── htk/                # Custom HTK components
│   ├── services/               # API calls (Supabase, etc)
│   ├── contexts/               # React contexts (Auth)
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities
│   └── App.tsx                 # Main app component
│
├── server/                      # Express backend
│   ├── routes/                 # API endpoints
│   ├── index.ts                # Server entry point
│   └── node-build.ts           # Build configuration
│
├── shared/                      # Shared types
│   └── api.ts                  # API types
│
├── public/                      # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts              # Frontend build config
├── vite.config.server.ts       # Backend build config
├── tailwind.config.ts
└── CLAUDE.md                    # This file
```

---

## 📋 MVP Phases

### Phase 1: Supabase Schema & Backend (CRITICAL)
- [ ] Design database schema (users, profiles, availability, bookings, plans, payments, progress)
- [ ] Create Supabase tables with proper relationships
- [ ] Configure RLS (Row-Level Security) policies
- [ ] Create Express endpoints for CRUD operations
- [ ] Test endpoints with sample data

**Branch:** `feature/phase-1-supabase-schema`

### Phase 2: Teacher Dashboard
- [ ] Dashboard main view (sessions, students, alerts)
- [ ] Calendar management (availability, slots, capacity)
- [ ] Patient list with history and progress
- [ ] Profile edit section
- [ ] Admin: Student management (plans, payments)

**Branch:** `feature/phase-2-teacher-dashboard`

### Phase 3: Student Dashboard
- [ ] Dashboard main view (upcoming classes, plan info, progress)
- [ ] Booking calendar (select professional, date, time)
- [ ] Plan management (view, renew)
- [ ] Payments section (history, subscribe)
- [ ] Profile management

**Branch:** `feature/phase-3-student-dashboard`

### Phase 4: Critical Features
- [ ] Route protection & auth guards
- [ ] Error handling & validation (Zod)
- [ ] Form validation (react-hook-form)
- [ ] Toast notifications
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] PWA configuration

**Branch:** `feature/phase-4-critical-features`

---

## 🔒 Security Notes

- Never commit `.env` files
- Never share credentials in chat/issues
- Use Personal Access Tokens (not passwords) for Git
- Configure RLS policies in Supabase
- Validate user roles on backend
- Sanitize inputs with Zod schemas

---

## 🧪 Testing

Use Vitest for unit tests. Files: `*.spec.ts` or `*.test.ts`

```bash
pnpm run test
```

---

## 📞 Quick Commands Reference

```bash
# Start new feature from develop
git checkout develop
git pull origin develop
git checkout -b feature/feature-name
git push -u origin feature/feature-name

# Push changes during development
git add .
git commit -m "feat(scope): description"
git push

# Create PR on GitHub manually via web

# After PR approval, merge and delete branch
git checkout develop
git pull origin develop
git branch -d feature/feature-name
git push origin --delete feature/feature-name
```

---

## 📈 Progress Tracking

- Each phase should have clear deliverables
- Use GitHub Projects for task tracking
- Create issues for bugs/tasks
- Link commits to issues with: `fixes #123` in commit message

---

## 💡 Development Tips

1. **Supabase Dashboard:** https://app.supabase.com
2. **Use Supabase SQL Editor** to test queries before implementing
3. **Test Auth flow** locally before pushing
4. **Type safety first:** Always use TypeScript types
5. **Component reusability:** Create shared components in `client/components/`
6. **API consistency:** Use zod schemas for request/response validation

---

## 📝 Notes

- Landing page (Index.tsx) is complete ✅
- Login page (Login.tsx) is complete ✅
- Mock data exists in dashboards - replace with real API calls
- Cronofy integration exists but needs configuration
- Contentful integration exists for plans/policies

---

**Last Updated:** 2026-05-28
**Status:** Ready for Phase 1 development
