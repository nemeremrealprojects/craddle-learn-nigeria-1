# CRF Online Academy — Build Plan

This is a large, real product (LMS + payments + 4 role dashboards). I'll build it in connected phases so each phase is functional before moving on. A few notes and one substitution before we start.

## Substitutions (please confirm)

1. **Backend: Lovable Cloud instead of Firebase.** Lovable Cloud is our built-in backend (Postgres + auth + storage + serverless functions). It gives you everything Firebase would (users, database, file storage for videos/PDFs, secure API keys) with zero external setup. If you truly need Firebase specifically, we'd have to connect it manually and it would take much longer — I recommend Cloud.
2. **Paystack:** integrated via a secure server function using your Paystack secret key (you'll paste it when prompted). Naira (₦), ₦3,000 per course.
3. **Video/PDF storage:** Lovable Cloud Storage (private buckets, access gated by enrollment).

## Phase 1 — Foundation & Design System
- Navy blue + gold design tokens in `src/styles.css` (oklch), premium typography, card/button variants.
- Public site shell: Home, About, Courses, Summer Courses, Admissions, Contact, Login/Register.
- Nigerian branding, contact numbers (07034391471, +2347048401355) in header, footer, contact, admissions.
- SEO head() per route, sitemap.xml, robots.txt.

## Phase 2 — Auth & Roles
- Enable Lovable Cloud. Email/password + Google sign-in.
- `profiles` table (name, phone, role-agnostic fields).
- `user_roles` table with enum: `student | parent | teacher | admin`, `has_role()` security-definer function (prevents RLS recursion and privilege escalation).
- Parent↔child linking table.
- Route guards for `/student`, `/parent`, `/teacher`, `/admin`.

## Phase 3 — Course Catalog (data)
Seed all required courses at ₦3,000 each:
- **Kindergarten:** English, Mathematics, Phonics, Reading Skills
- **Primary 1–6:** English, Mathematics, Basic Science, Reading Skills (+ Exam Prep for P6)
- **Summer:** English, Mathematics, Reading Program, Revision Classes, Holiday Learning
Tables: `courses`, `lessons` (video), `materials` (PDFs), `assignments`, `quizzes`, `quiz_questions`, `enrollments`, `lesson_progress`, `submissions`, `quiz_attempts`, `payments`, `certificates`, `announcements`.
Full RLS + GRANTs on every table.

## Phase 4 — Payments (Paystack)
- Server function `initialize-payment` (creates Paystack transaction, returns auth URL).
- Server function `verify-payment` (verifies reference, creates enrollment, records payment).
- Callback route `/payment/callback`.
- Requires: `PAYSTACK_SECRET_KEY` (I'll prompt via secrets form).

## Phase 5 — Student Platform
- Dashboard: enrolled courses, continue watching, progress %.
- Course player page: chaptered lesson list, HTML5 video player, prev/next, mark complete, resume position.
- Materials tab: downloadable PDFs (signed URLs, enrollment-gated).
- Assignments tab: view, submit (file/text), see grade & feedback.
- Quizzes tab: take quiz, auto-grade MCQ, view results.
- Certificate page: auto-generated PDF (student name, course, date, CRF branding) after 100% completion + passing quizzes.

## Phase 6 — Teacher Platform
- Course CRUD (for courses they own/are assigned).
- Lesson CRUD with video upload to Cloud Storage.
- Material upload (PDFs).
- Assignment & quiz builder.
- Submissions inbox → grade + feedback.
- Student roster + progress per course.

## Phase 7 — Parent Platform
- Link children (by student email/code — admin can also link).
- View each child's enrolled courses, progress, grades, announcements.
- Strictly RLS-scoped to their linked children only.

## Phase 8 — Admin Platform
- Users: create/edit/deactivate students, teachers, parents; assign teachers to courses.
- Courses: full CRUD, publish/unpublish.
- Payments: list transactions, revenue totals, confirm/refund manually.
- Admissions: application inbox (from public admission form).
- Announcements: create/target (all, role, course).

## Phase 9 — QA & Polish
- Mobile responsiveness pass.
- Playwright smoke: signup → enroll → pay (test key) → watch → quiz → certificate.
- Publish.

## Technical stack
- TanStack Start + React 19 + Tailwind v4 (already scaffolded).
- Lovable Cloud (Postgres, Auth, Storage, server functions).
- Paystack Inline redirect flow via server functions.
- shadcn/ui components with custom navy/gold variants.
- PDF certificate: `pdf-lib` in-browser generation.

## Scope-check before I start

This is 4–6 focused build sessions of work. I will build it end-to-end, but a few decisions will speed things up — please confirm:

1. **Backend = Lovable Cloud** (recommended) or must-be-Firebase?
2. **Google sign-in in addition to email/password** — OK to enable?
3. **Sample content:** should I seed each course with 3 placeholder video lessons + 2 sample PDFs + 1 quiz + 1 assignment so the flow is demonstrable end-to-end from day one? (Real teachers replace via their dashboard.)
4. **Paystack keys:** you'll provide the test secret key when I prompt. OK?

Reply "go" (with any answers to the 4 questions) and I'll start Phase 1 immediately.
