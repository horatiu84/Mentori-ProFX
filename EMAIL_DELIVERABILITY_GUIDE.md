# Ghid deliverability email

Acest document acopera partea operationala pentru emailurile trimise prin Resend.

## Ce exista deja in cod

- template HTML pentru emailul de invitatie
- template HTML pentru emailul VIP
- `reply_to` setat la `support@profx.ro`
- variabile dinamice in subiect si continut
- rate limiting si retry logic in `send-bulk-emails` si `send-vip-emails`

Nota: in codul actual, delay-ul intre emailuri in batch este `600ms`, nu `200ms`.

## Configurare obligatorie pentru productie

### 1. Verifica domeniul in Resend

Fara domeniu verificat, rata de livrare va fi semnificativ mai slaba.

DNS recomandat:

```text
SPF:   v=spf1 include:_spf.resend.com ~all
DKIM:  resend._domainkey -> resend._domainkey.resend.com
DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@profx.ro; pct=100
```

### 2. Fa warming up pe domeniu

Plan practic:

- ziua 1-2: 20-50 emailuri / zi
- ziua 3-5: 100-200 emailuri / zi
- ziua 6-10: 300-500 emailuri / zi
- dupa ziua 10: cresti treptat spre volumul normal

### 3. Monitorizeaza metricile

Tinteste:

- bounce rate sub 5%
- complaint rate sub 0.1%
- open rate peste 20%

Verificare: https://resend.com/emails

## Recomandari de continut

- evita subiecte agresive sau spammy
- pastreaza linkul de confirmare clar vizibil
- personalizeaza cu `{{nume}}`, `{{mentorName}}`, `{{webinarDate}}`
- testeaza pe Gmail, Outlook si Yahoo inainte de un batch mare

## Gap-uri actuale de produs

Acestea sunt recomandari, nu lucruri deja implementate:

- lipseste un flux de unsubscribe / opt-out
- nu exista webhook automat pentru bounce-uri in repo
- nu exista marcare nativa `emailValid` sau `bounceReason` in schema principala

## Test minim inainte de campanie

1. trimite un email singular catre o adresa reala
2. verifica Inbox, Spam si linkul de confirmare
3. ruleaza un test pe mail-tester.com
4. trimite un batch mic de 3-5 leaduri de test

## Cand sa opresti trimiterea

- daca testele ajung in Spam
- daca bounce rate-ul depaseste 5%
- daca domeniul nu este inca verificat complet
- daca `support@profx.ro` nu este monitorizat
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
