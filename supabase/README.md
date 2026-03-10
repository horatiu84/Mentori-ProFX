# Supabase Edge Functions

Folderul `supabase/` contine configurarea CLI si functiile Deno folosite de aplicatia React.

## Functii existente

- `authenticate` - autentificare custom si emitere JWT
- `manage-users` - listare si actualizare conturi
- `reset-password` - resetare parola de catre admin
- `send-email` - trimitere email individual pentru lead
- `send-bulk-emails` - trimitere emailuri pentru leadurile active ale unui mentor
- `send-vip-emails` - trimitere email VIP pentru absolventi
- `delete-leads` - stergere leaduri si sincronizare alocari
- `update-mentor-schedule` - setare / resetare date webinar
- `allocate-leads` - alocare manuala sau automata
- `update-lead-attendance` - operare prezenta pe sesiuni
- `update-lead` - editare lead
- `manage-email-templates` - citire si salvare template-uri din `settings`

## Instalare Supabase CLI

```bash
# Windows (PowerShell)
irm https://raw.githubusercontent.com/supabase/supabase/HEAD/packages/cli/scripts/install.ps1 | iex

# macOS / Linux
brew install supabase/tap/supabase

# sau cu npm
npm install -g supabase
```

## Link la proiect

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

## Secrete necesare

```bash
npx supabase secrets set AUTH_JWT_SECRET=your-long-random-secret
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
```

Setate automat in runtime-ul hostat Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## De ce `verify_jwt = false`

In `supabase/config.toml`, fiecare functie este configurata cu `verify_jwt = false` la nivel de gateway. Acest lucru este intentional: functiile valideaza manual JWT-ul aplicatiei, pentru ca folosim un token custom emis de `authenticate`, nu Supabase Auth standard.

## Deploy recomandat

```bash
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

## Dezvoltare locala

```bash
npx supabase start
npx supabase functions serve
```

Porturi utile definite in `config.toml`:

- API: `54321`
- DB: `54322`
- Studio: `54323`
- Inbucket: `54324`

## Debugging

```bash
npx supabase functions list
npx supabase functions logs authenticate
npx supabase functions logs send-email
npx supabase functions logs send-bulk-emails
```

Sau in Supabase Dashboard:

1. Edge Functions
2. selectezi functia
3. verifici `Logs`

## Structura folderului

```text
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

## Note importante

- login-ul din frontend depinde de `authenticate`
- functiile de email depind de `RESEND_API_KEY`
- actiunile admin-only valideaza `app_role === admin`
- template-urile lipsa sunt create automat in `settings` de `manage-email-templates`
