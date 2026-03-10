# Security Deployment Guide

Acest ghid explica ordinea corecta pentru activarea securitatii Supabase in proiectul actual.

## Ce securizeaza aceste fisiere

- `supabase-security-fix.sql` - activeaza RLS si politicile pentru tabelele principale
- `supabase-password-hash-migration.sql` - migreaza parole vechi in bcrypt
- `supabase-auth-rpc.sql` - adauga RPC-uri sigure pentru autentificare si resetare parola
- `supabase/functions/authenticate/index.ts` - login fara expunerea tabelei `users`
- `supabase/functions/reset-password/index.ts` - resetare parola doar pentru admin

## Pentru o instalare noua

Ruleaza in SQL Editor:

1. `supabase-schema.sql`
2. `supabase-security-fix.sql`
3. `supabase-auth-rpc.sql`

Nu ai nevoie de migrarea parolelor daca baza este noua, pentru ca `supabase-schema.sql` insereaza deja parole bcrypt pentru utilizatorii seed.

## Pentru o instanta veche

Ruleaza in ordinea urmatoare:

1. `supabase-password-hash-migration.sql`
2. `supabase-auth-rpc.sql`
3. `supabase-security-fix.sql`

## Deploy functii critice

```bash
npx supabase functions deploy authenticate
npx supabase functions deploy manage-users
npx supabase functions deploy reset-password
```

In practica, este recomandat sa deployezi toate functiile folosite de dashboard.

## Ce ramane functional dupa RLS

- formularul public de inscriere
- confirmarea participarii prin link
- dashboard-ul admin / mentor
- trimiterea emailurilor prin Edge Functions
- resetarea parolelor de catre admin

## Ce trebuie sa fie blocat

- acces direct din browser la tabela `users`
- acces neautorizat la hash-urile de parola

## Verificare dupa deploy

- login-ul functioneaza
- dashboard-ul incarca leaduri si mentori
- `users` nu mai este accesibila direct cu cheia publishable
- emailurile se trimit in continuare

## Schimbare parole

Pentru productie, schimba parolele seed imediat dupa prima logare.

Exemplu pentru resetare prin functie:

```bash
curl -X POST "https://<PROJECT-REF>.supabase.co/functions/v1/reset-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_APP_JWT>" \
  -d '{"username":"Sergiu","newPassword":"NewStrongPass123!"}'
```

## Rollback de urgenta

Doar daca ai blocat accidental aplicatia:

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE mentori DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaduri DISABLE ROW LEVEL SECURITY;
ALTER TABLE alocari DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE clase DISABLE ROW LEVEL SECURITY;
ALTER TABLE studenti DISABLE ROW LEVEL SECURITY;
```

Acest rollback reduce securitatea, deci trebuie folosit doar temporar.
