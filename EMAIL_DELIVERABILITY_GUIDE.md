# 📧 Ghid complet: Evită folderul SPAM

## ✅ Ce am implementat deja în cod

### 1. **Template HTML profesional**
- ✓ Structură HTML validă cu DOCTYPE
- ✓ Design responsive (meta viewport)
- ✓ Footer cu informații despre companie
- ✓ Link-uri către website și contact
- ✓ Anul curent dinamic în copyright
- ✓ Adresă email destinatar vizibilă în footer

### 2. **Headers email corecte**
- ✓ `reply_to: "support@profx.ro"` - permite răspunsuri
- ✓ Subject personalizat cu variabile
- ✓ Text plain alternativ pentru clienți email simpli
- ✓ Tags pentru tracking și categorizare

### 3. **Rate limiting**
- ✓ Delay de 200ms între emailuri pentru a respecta limitele

---

## 🚨 URGENT: Pași obligatorii pentru producție

### **Pas 1: Configurare domeniu custom (OBLIGATORIU)**

**Status actual:** Folosești `noreply@webinar.profx.ro` dar probabil nu ai configurat domeniul în Resend.

**Trebuie să faci:**

1. **Accesează Resend Dashboard**
   - Link: https://resend.com/domains
   - Click pe **"Add Domain"**

2. **Adaugă domeniul tău**
   - Introdu: `profx.ro` (sau `webinar.profx.ro` dacă vrei subdomeniu)

3. **Configurează DNS Records** (în panoul de hosting/domain)

   **SPF Record (TXT)**
   ```
   Nume: @
   Tip: TXT
   Valoare: v=spf1 include:_spf.resend.com ~all
   ```

   **DKIM Record (CNAME)**
   ```
   Nume: resend._domainkey
   Tip: CNAME
   Valoare: resend._domainkey.resend.com
   ```

   **DMARC Record (TXT)** - Recomandat
   ```
   Nume: _dmarc
   Tip: TXT
   Valoare: v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@profx.ro; pct=100
   ```

4. **Verificare**
   - Așteaptă 10-60 minute pentru propagare DNS
   - Resend va verifica automat domeniul
   - Status va deveni "Verified" (verde)

**Fără acest pas, șansele să ajungi în spam sunt FOARTE MARI!** ⚠️

---

### **Pas 2: Warming up domeniul (primele 2 săptămâni)**

**De ce?** Domeniile noi sunt suspectate de spam. Trebuie să construiești reputație gradual.

**Plan de warming:**

| Zi | Număr emailuri | Acțiune |
|-----|---------------|---------|
| 1-2 | 10-20/zi | Trimite doar către contacte cunoscute |
| 3-5 | 50-100/zi | Trimite către contacte verificate |
| 6-10 | 200-300/zi | Crește volumul treptat |
| 10-14 | 500+/zi | Volum normal |

**🔥 IMPORTANT:** 
- Monitorizează bounce rate - trebuie sub 5%
- Monitorizează complaint rate - trebuie sub 0.1%
- NU trimite către liste vechi/neactualizate

---

## 📊 Best Practices - Checklist complet

### ✅ **Conținut email**

- [x] Subject line sub 50 caractere
- [x] Evită cuvinte spam: "FREE", "CLICK HERE", "100% GRATUIT", "!!!"
- [x] Raport text/imagine echilibrat (60% text, 40% imagini)
- [x] Link-uri clare și visible
- [x] Personalizare (folosește {{nume}})
- [ ] **Include un link de unsubscribe** (GDPR obligatoriu!)

**Exemplu subject line bun:**
```
✓ "{{nume}}, Webinar 1:20 cu {{mentorName}} pe {{webinarDate}}"
✓ "Confirmă prezența la webinar - ProFX Mentori"
```

**Exemplu subject line rău:**
```
✗ "CLICK AICI!!! 100% GRATUIT Webinar AMAZING!!!"
✗ "RE: RE: FW: Important!!!"
```

---

### ✅ **Lista de contacte**

- [ ] **Double opt-in** - utilizatorii confirmă prin email că vor să primească mesaje
- [ ] **Curăță lista regulat** - șterge bounce-uri și contacte inactive
- [ ] **Segmentare** - trimite doar către cei interesați
- [ ] **Nu cumpăra liste de emailuri** - NICIODATĂ!

---

### ✅ **Monitorizare și metrici**

**Verifică zilnic în Resend Dashboard:**
- **Open Rate** - ideal: >20%
- **Click Rate** - ideal: >2%
- **Bounce Rate** - MAXIM 5% (peste = problemă serioasă)
- **Spam Complaint Rate** - MAXIM 0.1%

**Link monitorizare:** https://resend.com/emails

---

### ✅ **Testare înainte de trimitere masivă**

**Test #1: Mail-tester.com**
```bash
1. Accesează: https://www.mail-tester.com/
2. Copiază adresa generată (ex: test-abc123@srv1.mail-tester.com)
3. Trimite un email de test către acea adresă
4. Verifică scorul - MINIM 8/10 pentru a evita spam
```

**Test #2: Teste multiple cu domenii diferite**
```
Trimite email de test către:
- Gmail: test@gmail.com
- Outlook: test@outlook.com
- Yahoo: test@yahoo.com
- Propriul domeniu: test@profx.ro
```

Verifică să ajungă în **Inbox**, nu în Spam/Promotions.

---

## 🔧 Implementări recomandate în cod

### **1. Link de Unsubscribe (OBLIGATORIU pentru GDPR)**

Modifică template-ul să includă:

```typescript
// În footer, adaugă:
<p style="margin: 10px 0 0 0; font-size: 11px; color: #aaa; text-align: center;">
  <a href="{{unsubscribeLink}}" style="color: #999; text-decoration: underline;">
    Nu mai doresc să primesc emailuri
  </a>
</p>
```

**Implementare backend:**
```typescript
// În Mentors1la20.jsx, adaugă:
const unsubscribeLink = `${origin}/unsubscribe/${lead.id}`;

// Adaugă în replacements:
"{{unsubscribeLink}}": unsubscribeLink,
```

---

### **2. Verificare bounce-uri automat**

Resend trimite webhook-uri pentru bounce-uri. Implementează:

```typescript
// Nova funcție Supabase: handle-bounce-webhook
serve(async (req) => {
  const { type, data } = await req.json();
  
  if (type === "email.bounced") {
    // Marchează email-ul ca invalid în baza de date
    await supabase
      .from("leaduri")
      .update({ emailValid: false, bounceReason: data.reason })
      .eq("email", data.email);
  }
  
  return new Response("OK", { status: 200 });
});
```

Configurează webhook în Resend: https://resend.com/settings/webhooks

---

### **3. Evită trimiterea repetată**

```typescript
// Înainte de trimitere, verifică:
const { data: recentEmail } = await supabase
  .from("leaduri")
  .select("dataTrimiereEmail")
  .eq("id", lead.id)
  .single();

const daysSinceLastEmail = recentEmail?.dataTrimiereEmail 
  ? (Date.now() - new Date(recentEmail.dataTrimiereEmail).getTime()) / (1000 * 60 * 60 * 24)
  : 999;

if (daysSinceLastEmail < 3) {
  console.log(`⏰ Skip email pentru ${lead.email} - trimis recent`);
  continue; // Skip acest lead
}
```

---

## 🚀 Deploy modificări

După ce ai făcut toate modificările, redeploy funcțiile:

```bash
cd supabase
npx supabase functions deploy send-email
npx supabase functions deploy send-bulk-emails
```

---

## 📱 Contact și suport

**Resend Support:**
- Email: support@resend.com
- Docs: https://resend.com/docs
- Discord: https://resend.com/discord

**GDPR Compliance:**
- Informare: https://gdpr.eu/
- Template: https://gdpr.eu/privacy-notice/

---

## ⚠️ Checklist final înainte de lansare

- [ ] Domeniu custom configurat și verificat în Resend
- [ ] DNS records (SPF, DKIM, DMARC) setate corect
- [ ] Test cu mail-tester.com - scor >8/10
- [ ] Link de unsubscribe funcțional
- [ ] Double opt-in implementat pentru noi contacte
- [ ] Warming plan pregătit (primele 2 săptămâni)
- [ ] Monitorizare zilnică activată
- [ ] Reply-to email valid și monitorizat
- [ ] Template testat pe Gmail, Outlook, Yahoo
- [ ] Consent GDPR obținut de la utilizatori

---

**🎯 Reminder:** Un email în Inbox valorează mult mai mult decât 10 emailuri în Spam!

**Succes!** 🚀
