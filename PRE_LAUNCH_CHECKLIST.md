# ✅ Pre-Launch Checklist - Email Campaign

## Status Verificări

### 🔐 **Configurare Resend**
- [x] Domeniu verificat în Resend (`webinar.profx.ro` sau `profx.ro`)
- [x] RESEND_API_KEY setat în Supabase secrets
- [ ] Test email trimis și verificat că ajunge în Inbox
- [ ] Verificat că `support@profx.ro` există și e monitorizat

### 📧 **Email Configuration**
- [x] From: `noreply@webinar.profx.ro` (domeniu verificat)
- [x] Reply-to: `support@profx.ro` setat
- [x] Template HTML profesional implementat
- [x] Footer cu informații companie și link-uri

### 🎯 **Lista de contacte**
- [ ] Leadurile au emails valide (fără typo-uri)
- [ ] Leadurile au dat consent să primească emailuri
- [ ] Lista e curățată (fără duplicates)

### 🚀 **Deployment**
```bash
# Deploy funcțiile
cd supabase
npx supabase functions deploy send-email --no-verify-jwt
npx supabase functions deploy send-bulk-emails --no-verify-jwt

# Verifică că sunt live
npx supabase functions list
```

### 🧪 **Testare**
1. **Test 1: Email singular**
   - Trimite 1 email către propria adresă
   - Verifică: Subject, Content, Links, Footer
   - Verifică că ajunge în Inbox (NU Spam/Promotions)

2. **Test 2: Email bulk (3-5 leaduri test)**
   - Creează 3-5 leaduri cu email-uri de test
   - Trimite batch test
   - Verifică delivery rate în Resend Dashboard

3. **Test 3: Cross-platform**
   - [ ] Gmail - ajunge în Inbox?
   - [ ] Outlook/Hotmail - ajunge în Inbox?
   - [ ] Yahoo - ajunge în Inbox?
   - [ ] Apple Mail - ajunge în Inbox?

### 📊 **Monitorizare configurată**
- [ ] Bookmark: https://resend.com/emails
- [ ] Verificare zilnică: Delivery rate, Bounce rate, Complaint rate
- [ ] Alerte setate pentru bounce rate > 5%

### 🎨 **Conținut email validat**
- [ ] Subject line sub 50 caractere
- [ ] NU conține cuvinte spam: "GRATUIT", "CLICK HERE", "!!!"
- [ ] Link de confirmare funcționează
- [ ] Personalizare ({{nume}}, {{mentorName}}) funcționează
- [ ] Mobile-responsive (test pe telefon)

### 🔢 **Warming Up Plan**
```
Ziua 1-2:  20-50 emails/zi   → Trimite doar către contacte cunoscute
Ziua 3-5:  100-200 emails/zi → Crește volumul
Ziua 6-10: 300-500 emails/zi → Aproape de volum normal
Ziua 10+:  Volum complet     → Toate leadurile
```

### ⚖️ **GDPR & Legal**
- [ ] Privacy Policy disponibil pe website
- [ ] Users au dat opt-in pentru emailuri
- [ ] Informații despre companie în footer
- [ ] Metodă de contact clar specificată

---

## 🚦 GO / NO-GO Decision

### ✅ **GO - Gata de lansare dacă:**
- Toate verificările din "Configurare Resend" sunt [x]
- Test email ajunge în Inbox
- Bounce rate din teste < 5%
- Conținut email validat

### ⛔ **NO-GO - Oprește dacă:**
- Test email ajunge în Spam
- Bounce rate din teste > 5%
- Domeniu nu e verificat 100% în Resend
- Reply-to email nu există/nu e monitorizat

---

## 📞 **În caz de probleme**

### Email ajunge în Spam?
1. Verifică scor cu https://www.mail-tester.com/ (minim 8/10)
2. Verifică DNS records: https://mxtoolbox.com/
3. Reduce volumul și warming up mai agresiv

### Bounce rate mare?
1. Curăță lista - șterge emailuri invalide
2. Verifică typo-uri în adrese email
3. Nu trimite către domenii temporare (temp-mail.org etc)

### Complaint rate mare?
1. Verifică că ai consent de la utilizatori
2. Îmbunătățește conținutul emailului
3. Oferă opțiune de unsubscribe clară

---

## 🎉 **Post-Launch Monitoring**

### Primele 24h:
- [ ] Check Resend Dashboard la fiecare 4 ore
- [ ] Verifică bounce rate
- [ ] Răspunde imediat la reply-uri

### Prima săptămână:
- [ ] Check zilnic metrici în Resend
- [ ] Monitorizează complaint rate
- [ ] Ajustează warming plan dacă e nevoie

### Luna 1:
- [ ] Review overall delivery rate (target: >95%)
- [ ] Identifică pattern-uri în bounces
- [ ] Optimizează conținut bazat pe open/click rates

---

**💡 Reminder:** E mai bine să trimiți 100 emailuri care ajung în Inbox decât 1000 care ajung în Spam!

**Succes cu campania! 🚀**
