# Supabase Edge Functions - ProFX Mentori

## Funcții disponibile:

1. **send-email** - Trimite un email către un singur lead
2. **send-bulk-emails** - Trimite emailuri în masă către toți leadurile unui mentor

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
# Deploy ambele funcții
npx supabase functions deploy send-email
npx supabase functions deploy send-bulk-emails

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

Aplicația React deja folosește aceste URL-uri, așa că nu mai trebuie modificat nimic în cod! 🎉

## Logs și debugging

```bash
# Vezi logs-urile funcțiilor
npx supabase functions insights send-email
npx supabase functions insights send-bulk-emails
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
