# Supabase Edge Functions - ProFX Mentori

## Funcții disponibile:

1. **send-email** - Trimite un email către un singur lead
2. **send-bulk-emails** - Trimite emailuri în masă către toți leadurile unui mentor
3. **delete-leads** - Șterge leaduri din panoul de admin prin service role (single, toate, sau per mentor)
4. **update-mentor-schedule** - Setează sau resetează sesiunile webinar 1:20 pentru admin sau mentorul propriu
5. **allocate-leads** - Alocă manual sau automat leaduri către mentori prin service role
6. **update-lead-attendance** - Marchează și corectează prezența leadurilor din dashboard-ul mentorului
7. **update-lead** - Editează leaduri din dashboard-ul de admin prin service role
8. **manage-email-templates** - Citește și salvează template-urile email/VIP prin service role

## Instalare Supabase CLI

```bash
# Windows (PowerShell)
irm https://raw.githubusercontent.com/supabase/supabase/HEAD/packages/cli/scripts/install.ps1 | iex

# macOS / Linux
brew install supabase/tap/supabase

# Sau cu npm
npm install -g supabase
```

## Deploy funcțiilor

### 1. Login în Supabase CLI

```bash
npx supabase login
```

### 2. Link proiectul

```bash
npx supabase link --project-ref lefdbvjzyrcclnwlriyx
```

### 3. Setează secretele necesare

```bash
# RESEND_API_KEY - API key-ul de la Resend.com
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx

# SUPABASE_URL și SUPABASE_SERVICE_ROLE_KEY sunt automate setate de Supabase
```

**Unde găsești RESEND_API_KEY:**
- Intră pe https://resend.com/api-keys
- Creează un nou API Key sau folosește unul existent
- Copiază cheia și folosește-o în comanda de mai sus

### 4. Deploy funcțiile

```bash
# Deploy funcțiile principale
npx supabase functions deploy send-email
npx supabase functions deploy send-bulk-emails
npx supabase functions deploy delete-leads --no-verify-jwt
npx supabase functions deploy update-mentor-schedule --no-verify-jwt
npx supabase functions deploy allocate-leads --no-verify-jwt
npx supabase functions deploy update-lead-attendance --no-verify-jwt
npx supabase functions deploy update-lead --no-verify-jwt
npx supabase functions deploy manage-email-templates --no-verify-jwt

# Sau deploy toate dintr-o dată
npx supabase functions deploy
```

## Test local (opțional)

```bash
# Pornește Supabase local
npx supabase start

# Deploy funcțiile local
npx supabase functions serve send-email
npx supabase functions serve send-bulk-emails
```

## Verificare după deploy

După deploy, funcțiile vor fi disponibile la:
- `https://lefdbvjzyrcclnwlriyx.supabase.co/functions/v1/send-email`
- `https://lefdbvjzyrcclnwlriyx.supabase.co/functions/v1/send-bulk-emails`
- `https://lefdbvjzyrcclnwlriyx.supabase.co/functions/v1/delete-leads`
- `https://lefdbvjzyrcclnwlriyx.supabase.co/functions/v1/update-mentor-schedule`
- `https://lefdbvjzyrcclnwlriyx.supabase.co/functions/v1/allocate-leads`
- `https://lefdbvjzyrcclnwlriyx.supabase.co/functions/v1/update-lead-attendance`
- `https://lefdbvjzyrcclnwlriyx.supabase.co/functions/v1/update-lead`
- `https://lefdbvjzyrcclnwlriyx.supabase.co/functions/v1/manage-email-templates`

Aplicația React deja folosește aceste URL-uri, așa că nu mai trebuie modificat nimic în cod! 🎉

## Logs și debugging

```bash
# Vezi logs-urile funcțiilor
npx supabase functions insights send-email
npx supabase functions insights send-bulk-emails
npx supabase functions insights delete-leads
npx supabase functions insights update-mentor-schedule
npx supabase functions insights allocate-leads
npx supabase functions insights update-lead-attendance
npx supabase functions insights update-lead
npx supabase functions insights manage-email-templates
```

Sau direct în Supabase Dashboard:
1. Mergi la **Edge Functions** în sidebar
2. Selectează funcția
3. Click pe **Logs** tab

## Structura fișierelor

```
supabase/
└── functions/
    ├── send-email/
    │   └── index.js
    └── send-bulk-emails/
        └── index.js
    └── delete-leads/
        └── index.ts
    └── update-mentor-schedule/
        └── index.ts
    └── allocate-leads/
        └── index.ts
    └── update-lead-attendance/
        └── index.ts
    └── update-lead/
        └── index.ts
    └── manage-email-templates/
        └── index.ts
```

## Variabile de mediu necesare în Supabase

Acestea sunt setate automat sau le configurezi cu `supabase secrets set`:

- ✅ `SUPABASE_URL` - Automat
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Automat (nu confunda cu PUBLISHABLE_KEY!)
- ⚠️ `RESEND_API_KEY` - Trebuie setat manual (vezi pasul 3)

## Email-ul de la care se trimit mesajele

**Important:** În cod folosim `onboarding@resend.dev` care este email-ul de test al Resend. 
Pentru producție, trebuie să:

1. Adaugi propriul domeniu în Resend Dashboard
2. Verifici domeniul (DNS records)
3. Schimbi `from` în cod de la `onboarding@resend.dev` la `mentori@tau-domeniu.ro`

Pentru test, `onboarding@resend.dev` funcționează perfect! ✉️
