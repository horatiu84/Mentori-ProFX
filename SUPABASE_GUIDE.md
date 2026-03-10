# Supabase Guide

Acest document descrie backend-ul real folosit de aplicatie: schema SQL, autentificarea custom, politicile RLS si Edge Functions.

## Model functional

Aplicatia are doua zone principale:

- zona publica: formular de inscriere si confirmarea prin link
- zona protejata: dashboard admin / mentor

Fluxul principal este:

1. un lead completeaza formularul public
2. leadul este stocat in `leaduri` cu status `nealocat`
3. adminul aloca leadul unui mentor
4. mentorul sau adminul programeaza webinarul
5. aplicatia trimite email de invitatie cu `confirmationToken`
6. leadul confirma din link, iar statusul devine `confirmat`
7. mentorul opereaza prezenta pe sesiunile 1, 2 si 3
8. absolventii pot primi emailul VIP

## Tabele principale

### `users`

Conturi pentru autentificarea in dashboard.

Campuri importante:

- `username`
- `password` - hash bcrypt
- `role` - `admin` sau `mentor`
- `mentorId` - legatura optionala cu tabela `mentori`

### `mentori`

Contine mentorii operativi si starea lor curenta.

Campuri importante:

- `id`
- `nume`
- `available`
- `ultimulOneToTwenty`
- `webinar2Date`
- `webinar3Date`
- `leaduriAlocate`
- `manuallyDisabled`

### `leaduri`

Tabela principala pentru funnel-ul webinarului.

Campuri importante:

- `nume`, `telefon`, `email`
- `status`
- `mentorAlocat`
- `dataAlocare`
- `dataConfirmare`
- `dataTimeout`
- `emailTrimis`
- `confirmationToken`
- `istoricMentori`
- `numarReAlocari`
- `prezenta1`, `prezenta2`, `prezenta3`

Statusurile utilizate in frontend sunt definite in `src/constants.js`:

- `nealocat`
- `alocat`
- `confirmat`
- `neconfirmat`
- `no_show`
- `complet`
- `in_program`
- `complet_3_sesiuni`
- `complet_2_sesiuni`
- `complet_sesiune_finala`
- `complet_sesiune_1`

### `alocari`

Retine grupuri de alocare si legatura dintre mentor si setul de leaduri alocate.

### `settings`

Pastreaza template-urile de email.

ID-uri importante:

- `emailTemplate`
- `vipEmailTemplate`

### `clase` si `studenti`

Aceste tabele sunt in schema si in politicile RLS, dar nu reprezinta fluxul central actual al produsului. Au ramas compatibile cu versiuni anterioare ale proiectului.

## Autentificare

Aplicatia foloseste JWT custom emis de Edge Function-ul `authenticate`.

Caracteristici:

- browserul nu acceseaza direct tabela `users`
- parola este verificata in backend
- token-ul contine `app_role`, `mentor_id` si `user_id`
- frontend-ul stocheaza token-ul in `localStorage`
- `ProtectedRoute` valideaza expirarea JWT-ului in client

Ordinea recomandata pentru autentificare securizata:

1. `supabase-schema.sql`
2. `supabase-password-hash-migration.sql` doar daca migrezi o instanta veche
3. `supabase-auth-rpc.sql`
4. `supabase-security-fix.sql`

## Row Level Security

RLS este definit in `supabase-security-fix.sql`.

Rezumatul politicilor:

- `users` este accesibila doar cu `service_role`
- `leaduri` permite insert anonim pentru formularul public
- `leaduri` permite update anonim limitat pentru confirmarea participarii
- dashboard-ul poate lucra cu `authenticated`
- Edge Functions pot opera cu `service_role`

Acesta este motivul pentru care aplicatia foloseste doua tipuri de actiuni:

- operatii simple direct din frontend catre Supabase REST
- operatii privilegiate prin Edge Functions

## Edge Functions folosite de aplicatie

### `authenticate`
Valideaza username + parola si emite JWT-ul aplicatiei.

### `manage-users`
Adminul poate lista conturile si actualiza username / parola cunoscand parola veche.

### `reset-password`
Admin-only password reset fara parola veche.

### `send-email`
Trimite email individual pentru un lead si seteaza `confirmationToken`.

### `send-bulk-emails`
Trimite emailuri pentru toate leadurile active ale unui mentor.

### `send-vip-emails`
Trimite emailul VIP tuturor leadurilor cu status `complet_3_sesiuni`.

### `delete-leads`
Sterge leaduri si sincronizeaza contarile / alocarile afectate.

### `update-mentor-schedule`
Seteaza sau reseteaza datele webinarului pentru mentor.

### `allocate-leads`
Alocare manuala sau automata a leadurilor catre mentori disponibili.

### `update-lead-attendance`
Marcheaza sau corecteaza prezenta pe sesiuni.

### `update-lead`
Editeaza datele unui lead din dashboard-ul admin.

### `manage-email-templates`
Citeste si salveaza template-urile de email in tabela `settings`.

## Variabile si secrete

### Frontend

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

### Edge Functions

- `AUTH_JWT_SECRET`
- `RESEND_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Emailuri si confirmare

Fluxul de email este:

1. dashboard-ul cere functiei `send-email` sau `send-bulk-emails`
2. functia citeste mentorul, leadul si template-ul din baza de date
3. functia genereaza `confirmationToken`
4. functia trimite emailul prin Resend
5. functia scrie `emailTrimis`, `dataTrimiereEmail`, `dataTimeout` si `confirmationToken`
6. pagina `/confirm/:token` consuma token-ul si confirma participarea

## Observatii despre proiect

- exista cod Firebase legacy in folderul `functions/`, dar nu este fluxul activ documentat aici
- nu exista teste automate in repo
- `src/Mentors1la20.jsx` si `src/components/AdminDashboard.jsx` concentreaza mare parte din logica operationala

## Fisiere SQL importante

- `supabase-schema.sql` - schema completa si seed initial
- `supabase-security-fix.sql` - RLS si politici
- `supabase-auth-rpc.sql` - RPC pentru autentificare si resetare parola in DB
- `supabase-password-hash-migration.sql` - migrare parole plaintext -> bcrypt
- `supabase-session-3-migration.sql` - coloane suplimentare pentru sesiunea 3
- `supabase-lead-email-unique.sql` - index unic pe email normalizat