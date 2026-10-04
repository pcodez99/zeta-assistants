# Recupero password

Dal login, “Password dimenticata?” apre `/forgot-password`. La mail contiene
un collegamento a `/reset-password` sul dominio definito da `FRONTEND_URL`.
Il token casuale è nel frammento URL, è conservato nel database solo come hash,
scade dopo 30 minuti ed è consumato atomicamente una sola volta. Il reset revoca
sia i token di accesso sia le sessioni di refresh precedenti.

La risposta non rivela se l'email esiste. Ogni account può richiedere una mail
al minuto; ogni IP ha 10 richieste per endpoint ogni 15 minuti. Il limite IP è
in memoria per la singola istanza. L'invio SMTP è asincrono nel processo:
non è una coda persistente. In caso di errore SMTP, la richiesta viene annullata
e può essere ripetuta; i log non contengono token o credenziali.

## Produzione

I secret `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
sono nell'environment GitHub `Production`. La pipeline li trasferisce via SSH
al file protetto `/opt/assistants/.env.production` e ricrea l'app Docker.
Mailgun EU usa `smtp.eu.mailgun.org:587` con STARTTLS obbligatorio.
Il tracking Mailgun viene disabilitato per queste email.

Il callback Google da autorizzare nella console è
`https://assistant.zetalinks.it/api/auth/google/callback`.

## Verifica automatica

La pipeline usa PostgreSQL e Mailpit isolati, senza inviare email esterne.
`scripts/password-reset-test.cjs`, richiamato dallo smoke test, verifica
consegna SMTP, risposta generica, cooldown, scadenza, validazione password,
consumo concorrente del token, revoca delle sessioni e accesso con la nuova
password. Gli account e i dati di test vengono eliminati al termine.
