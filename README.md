# ProFX Webinarii

Aplicatie web pentru captarea leadurilor, alocarea lor catre mentori si operarea webinarului 1:20 ProFX. Stack-ul actual este React + Vite pe frontend, Supabase pentru baza de date si Edge Functions, si Resend pentru trimiterea emailurilor.

## Ce face aplicatia

- Formular public de inscriere pentru leaduri
- Confirmare participare prin link unic cu expirare la 6 ore
- Dashboard protejat pentru admin si mentori
- Alocare automata sau manuala a leadurilor catre mentori
- Programare sesiuni webinar si urmarirea prezentei pe 3 sesiuni
- Emailuri individuale, bulk si VIP prin Resend
- Administrare conturi utilizatori din dashboard
- Import leaduri din Excel si export date

## Rute disponibile

```text
/                  -> formular public de inscriere
/login             -> autentificare admin / mentor
/confirm/:token    -> confirmarea participarii din email
/admin             -> dashboard protejat
```

## Stack tehnic

- React 19
- Vite 7
- React Router 7
- Supabase JavaScript SDK
- Supabase Postgres + Row Level Security
- Supabase Edge Functions (Deno)
- Resend pentru emailuri tranzactionale
- ExcelJS pentru import / export

## Arhitectura pe scurt

- Frontend-ul public scrie leaduri in tabela `leaduri` folosind cheia publishable Supabase si politici RLS pentru `anon`
- Login-ul nu expune tabela `users`; autentificarea se face prin Edge Function-ul `authenticate`
- Actiunile privilegiate din dashboard trec prin Edge Functions care valideaza JWT-ul aplicatiei si folosesc `service_role`
- Confirmarea din email foloseste `confirmationToken` si actualizeaza leadul direct din pagina publica

## Structura relevanta a proiectului

```text
src/
  App.jsx
  Mentors1la20.jsx
  constants.js
  supabase.js
  components/
    AdminDashboard.jsx
    MentorDashboard.jsx
    ProtectedRoute.jsx
  pages/
    RegisterForm.jsx
    Login.jsx
    ConfirmWebinar.jsx
  utils/
    auth.js
    sanitize.js

supabase/
  config.toml
  functions/
    authenticate/
    manage-users/
    reset-password/
    send-email/
    send-bulk-emails/
    send-vip-emails/
    delete-leads/
    update-mentor-schedule/
    allocate-leads/
    update-lead-attendance/
    update-lead/
    manage-email-templates/
```

## Setup rapid

1. Copiaza `.env.example` in `.env` si completeaza variabilele Supabase.
2. Ruleaza `npm install`.
3. Ruleaza in Supabase SQL Editor fisierele de schema si securitate descrise in [QUICKSTART.md](QUICKSTART.md).
4. Configureaza secretele Edge Functions, in special `AUTH_JWT_SECRET` si `RESEND_API_KEY`.
5. Deploiaza Edge Functions sau ruleaza `supabase start` pentru mediu local.
6. Porneste frontend-ul cu `npm run dev`.

## Comenzi utile

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Stare verificata in repo

- `npm run build` trece
- `npm run lint` trece
- Nu exista teste automate in repo in momentul de fata

## Documentatie inclusa

- [QUICKSTART.md](QUICKSTART.md) - setup local si ordinea recomandata de instalare
- [SUPABASE_GUIDE.md](SUPABASE_GUIDE.md) - baza de date, autentificare, Edge Functions si fluxuri
- [SECURITY_FIX_DEPLOYMENT.md](SECURITY_FIX_DEPLOYMENT.md) - activare RLS si hardening pentru medii existente
- [EMAIL_DELIVERABILITY_GUIDE.md](EMAIL_DELIVERABILITY_GUIDE.md) - configurare Resend si bune practici pentru deliverability
- [PRE_LAUNCH_CHECKLIST.md](PRE_LAUNCH_CHECKLIST.md) - checklist operational inainte de lansare
- [supabase/README.md](supabase/README.md) - deploy si debugging pentru Edge Functions
- [supabase/RESEND_SETUP.md](supabase/RESEND_SETUP.md) - configurarea cheii Resend si a domeniului de trimitere

## Observatie despre codul legacy

Folderul `functions/` contine o implementare Firebase Functions mai veche. Fluxul activ al aplicatiei este cel din `supabase/functions/`. Documentatia din acest repo trateaza Supabase drept backend-ul curent.
