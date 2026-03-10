# Quick Start

Ghid minim pentru a porni proiectul local pe stack-ul actual: Vite + Supabase + Edge Functions + Resend.

## 1. Cerinte

- Node.js 20+
- npm
- Supabase project existent sau `supabase start` pentru mediu local
- Supabase CLI daca vrei sa rulezi / deploiezi functiile

## 2. Configureaza mediul frontend

1. Copiaza `.env.example` in `.env`
2. Completeaza variabilele:

```bash
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJ...
```

Acestea se gasesc in Supabase Dashboard -> Project Settings -> API.

## 3. Instaleaza dependintele

```bash
npm install
```

## 4. Initializeaza baza de date

Pentru o instalare noua, ruleaza in Supabase SQL Editor, in aceasta ordine:

1. `supabase-schema.sql`
2. `supabase-security-fix.sql`
3. `supabase-auth-rpc.sql`

Pentru upgrade-uri din versiuni mai vechi:

- `supabase-password-hash-migration.sql` daca ai utilizatori cu parole plaintext
- `supabase-session-3-migration.sql` daca instanta veche nu are coloanele pentru sesiunea 3
- `supabase-lead-email-unique.sql` daca instanta veche nu are indexul unic pe email normalizat

## 5. Configureaza secretele pentru Edge Functions

Seteaza in Supabase urmatoarele secrete:

```bash
npx supabase secrets set AUTH_JWT_SECRET=your-long-random-secret
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
```

`SUPABASE_URL` si `SUPABASE_SERVICE_ROLE_KEY` sunt disponibile automat in mediul hostat Supabase.

Important:

- `AUTH_JWT_SECRET` trebuie sa fie acelasi secret folosit pentru validarea JWT-urilor aplicatiei
- fara `RESEND_API_KEY`, functiile de email nu vor putea trimite mesaje

## 6. Deploiaza Edge Functions

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy authenticate
npx supabase functions deploy manage-users
npx supabase functions deploy reset-password
npx supabase functions deploy send-email
npx supabase functions deploy send-bulk-emails
npx supabase functions deploy send-vip-emails
npx supabase functions deploy delete-leads
npx supabase functions deploy update-mentor-schedule
npx supabase functions deploy allocate-leads
npx supabase functions deploy update-lead-attendance
npx supabase functions deploy update-lead
npx supabase functions deploy manage-email-templates
```

Alternativ, pentru dezvoltare locala:

```bash
npx supabase start
npx supabase functions serve
```

## 7. Porneste frontend-ul

```bash
npm run dev
```

Aplicatia va fi disponibila implicit la `http://localhost:5173`.

## 8. Rute de verificare

```text
http://localhost:5173/                -> formular public
http://localhost:5173/login           -> login admin / mentor
http://localhost:5173/admin           -> dashboard protejat
http://localhost:5173/confirm/<token> -> confirmare lead din email
```

## 9. Utilizatori initiali

`supabase-schema.sql` creeaza automat utilizatori initiali


## 10. Verificare rapida

- Formularul public poate insera leaduri noi
- Login-ul functioneaza prin `authenticate`
- Dashboard-ul incarca mentori, leaduri si alocari
- Template-urile email pot fi citite / salvate
- Trimiterea unui email de test functioneaza prin Resend

## Probleme comune

### Frontend-ul afiseaza `Missing Supabase environment variables`
Completeaza `.env` cu `VITE_SUPABASE_URL` si `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.

### Login-ul returneaza `Auth misconfiguration`
Verifica secretele `AUTH_JWT_SECRET`, `SUPABASE_URL` si `SUPABASE_SERVICE_ROLE_KEY` in Edge Functions.

### Emailurile nu se trimit
Verifica `RESEND_API_KEY`, domeniul verificat in Resend si ghidul din [supabase/RESEND_SETUP.md](supabase/RESEND_SETUP.md).

### Confirmarea din email nu functioneaza
Verifica faptul ca emailul a setat `confirmationToken` si ca leadul este in status `alocat`.

## Documente de continuare

- [README.md](README.md)
- [SUPABASE_GUIDE.md](SUPABASE_GUIDE.md)
- [SECURITY_FIX_DEPLOYMENT.md](SECURITY_FIX_DEPLOYMENT.md)
