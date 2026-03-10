# Configurare Resend

Acest proiect foloseste Resend pentru emailurile de invitatie si pentru campania VIP.

## 1. Creeaza cheia API

1. Intra in https://resend.com/api-keys
2. Creeaza un API key cu permisiune de trimitere
3. Copiaza cheia generata

Cheia are forma:

```text
re_xxxxxxxxxxxxxxxxxxxxxxxxx
```

## 2. Salveaza cheia in Supabase

```bash
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
```

## 3. Configureaza domeniul de trimitere

In cod, emailurile actuale folosesc adrese de forma:

- `noreply@webinar.profx.ro`
- `support@profx.ro` pentru reply-to

Pentru productie, domeniul trebuie verificat in Resend Dashboard -> Domains.

DNS minim recomandat:

```text
SPF:   v=spf1 include:_spf.resend.com ~all
DKIM:  resend._domainkey -> resend._domainkey.resend.com
DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@profx.ro; pct=100
```

## 4. Cum foloseste aplicatia Resend

- `send-email` - trimite un email catre un singur lead si genereaza tokenul de confirmare
- `send-bulk-emails` - trimite emailuri tuturor leadurilor active ale unui mentor
- `send-vip-emails` - trimite emailul VIP absolventilor

Toate aceste functii citesc template-urile din tabela `settings`.

## 5. Recomandare de test

Inainte de o trimitere reala:

1. creeaza un lead de test
2. trimite un email singular din dashboard
3. verifica inbox, spam si linkul de confirmare
4. testeaza apoi un batch mic de 3-5 leaduri

## 6. Troubleshooting

### `API key is invalid`
Verifica valoarea salvata in `RESEND_API_KEY`.

### Email trimis dar nu ajunge
Verifica Resend Logs, folderul Spam si configurarea SPF / DKIM / DMARC.

### Confirm link invalid
Verifica daca functia de email a scris `confirmationToken` si `dataTimeout` in tabela `leaduri`.

## Linkuri utile

- https://resend.com/home
- https://resend.com/domains
- https://resend.com/emails
- https://resend.com/docs
