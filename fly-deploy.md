# Deploy su Fly.io

## Configurazione Volume Persistente

Prima del deploy, crea il volume per SQLite:

```bash
# Crea il volume (esegui solo la prima volta)
fly volumes create meccanico_data --region fra --size 1

# Deploy dell'applicazione
fly deploy

# Verifica lo stato
fly status
```

## Note importanti:

1. Il volume `meccanico_data` viene montato su `/home/data` dove risiede il database SQLite
2. Il volume persiste anche quando l'app si ferma (auto-stop)
3. Fly.io gestisce automaticamente i backup del volume
4. La porta 443 è mappata automaticamente a HTTPS pubblico

## Variabili d'ambiente da configurare:

```bash
fly secrets set SECRET_KEY="your-production-secret-key"
fly secrets set ADMIN_PASSWORD="your-secure-password"
```