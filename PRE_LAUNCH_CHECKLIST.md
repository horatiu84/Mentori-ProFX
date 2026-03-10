# Pre-launch checklist

Checklist operational pentru momentul in care vrei sa folosesti proiectul pe trafic real.

## Setup tehnic

- [ ] `.env` configurat cu variabilele Supabase corecte
- [ ] `supabase-schema.sql` rulat
- [ ] `supabase-security-fix.sql` rulat
- [ ] `supabase-auth-rpc.sql` rulat
- [ ] toate Edge Functions sunt deployate
- [ ] `AUTH_JWT_SECRET` setat
- [ ] `RESEND_API_KEY` setat

## Verificari functionale

- [ ] formularul public adauga un lead nou
- [ ] login-ul functioneaza pentru admin
- [ ] login-ul functioneaza pentru un mentor
- [ ] dashboard-ul incarca leadurile si mentorii
- [ ] alocarea manuala functioneaza
- [ ] trimiterea unui email singular functioneaza
- [ ] confirmarea prin link schimba statusul in `confirmat`
- [ ] operarea prezentei pe sesiuni functioneaza
- [ ] emailul VIP poate fi trimis catre absolventi

## Email si deliverability

- [ ] domeniul de trimitere este verificat in Resend
- [ ] `support@profx.ro` exista si este monitorizat
- [ ] un email de test ajunge in Inbox
- [ ] linkul de confirmare functioneaza din email
- [ ] testele pe Gmail / Outlook / Yahoo sunt acceptabile
- [ ] bounce rate-ul initial este sub 5%

## Date si operare

- [ ] leadurile existente au emailuri valide
- [ ] nu exista duplicate evidente in lista de leaduri
- [ ] mentorii au datele webinarului setate corect
- [ ] template-urile `emailTemplate` si `vipEmailTemplate` sunt revizuite

## Securitate

- [ ] tabela `users` nu este accesibila direct cu cheia publishable
- [ ] parolele seed au fost schimbate
- [ ] actiunile admin-only functioneaza doar pentru admin

## GO / NO-GO

Lansare recomandata doar daca:

- emailurile trec testele minime de livrare
- autentificarea si dashboard-ul sunt stabile
- RLS este activ si verificat
- fluxul complet lead -> email -> confirmare -> prezenta este validat cap-coada
