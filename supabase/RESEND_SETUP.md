# Ghid Rapid: Obținere RESEND_API_KEY

## Pașii pentru configurarea Resend.com

### 1. Creează un cont Resend (GRATUIT)

Accesează: https://resend.com/signup

**Plan gratuit include:**
- 100 emailuri/zi
- 3,000 emailuri/lună
- Perfect pentru testare și proiecte mici! 🎉

### 2. Verifică email-ul

După înregistrare, verifică adresa de email pentru a activa contul.

### 3. Obține API Key

1. După login, vei fi pe dashboard
2. Click pe **API Keys** în sidebar (sau direct: https://resend.com/api-keys)
3. Click pe **Create API Key**
4. Dă-i un nume (ex: "ProFX Mentori Production")
5. Selectează permisiuni: **Sending access** (implicit)
6. Click **Add**
7. **IMPORTANT:** Copiază cheia și salvează-o undeva sigur! Nu va mai fi afișată din nou!

Cheia arată așa: `re_123abc456def789ghi012jkl345mno`

### 4. Setează cheia în Supabase

```bash
npx supabase secrets set RESEND_API_KEY=re_123abc456def789ghi012jkl345mno
```

### 5. Test email-ul (Opțional dar recomandat)

După ce ai deploiat funcțiile, poți testa:

```bash
curl -X POST https://lefdbvjzyrcclnwlriyx.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUPABASE_ANON_KEY" \
  -d '{"leadId": "test-id", "mentorId": "sergiu"}'
```

## Email de test vs Email production

### Pentru dezvoltare (ce folosim acum):
```javascript
from: "ProFX Mentori <onboarding@resend.dev>"
```
- Funcționează imediat, fără configurare domeniu
- Perfect pentru testing
- Limitare: 100 emailuri/zi în plan gratuit

### Pentru producție (recomandat):
```javascript
from: "ProFX Mentori <mentori@profx.ro>"
```

**Pași pentru email custom:**
1. În Resend Dashboard → **Domains**
2. Click **Add Domain**
3. Introdu domeniul tău (ex: `profx.ro`)
4. Adaugă DNS records în configurația domeniului tău:
   - TXT record pentru SPF
   - CNAME records pentru DKIM
5. Așteaptă verificare (~10 minute - câteva ore)
6. După verificare, schimbă `from` în cod

**Verificare domeniu:**
```
SPF: v=spf1 include:_spf.resend.com ~all
DKIM: resend._domainkey IN CNAME resend._domainkey.resend.com
```

## Link-uri utile

- 📧 Resend Dashboard: https://resend.com/home
- 🔑 API Keys: https://resend.com/api-keys
- 🌐 Domenii: https://resend.com/domains
- 📊 Logs: https://resend.com/emails
- 📖 Documentație: https://resend.com/docs/introduction

## Troubleshooting

**Eroare: "API key is invalid"**
- Verifică că ai copiat corect cheia (inclusiv prefixul `re_`)
- Asigură-te că nu ai spații înainte/după cheie

**Emailurile nu ajung**
- Verifică în Resend Logs dacă emailul a fost trimis
- Caută în spam/junk
- Pentru `onboarding@resend.dev`, emailurile merg doar pe adrese reale (nu temporary email)

**Limita de 100 emailuri/zi depășită**
- Upgrade la plan plătit (de la $20/lună pentru 50,000 emailuri)
- Sau folosește mai multe API keys pentru medii diferite (dev/staging/prod)
