# 💾 Backup Strategy - Production Database

## 📋 Overview

**Database**: PostgreSQL  
**Backup Tool**: `pg_dump`  
**Retention**: 30 days (daily), 12 months (monthly)  
**Storage**: Local + S3/Cloud Storage  

---

## 🔧 Automated Backup Script

### Script: `scripts/backup-database.sh`

```bash
#!/bin/bash
# Backup PostgreSQL database with rotation

set -e

# Configuration
DB_NAME="${DATABASE_NAME:-zillowlike}"
DB_USER="${DATABASE_USER:-postgres}"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgres}"
RETENTION_DAYS=30
S3_BUCKET="${S3_BACKUP_BUCKET:-}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "🔄 Starting backup of database: $DB_NAME"

# Run pg_dump with compression
PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  | gzip > "$BACKUP_FILE"

# Verify backup file
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup created successfully: $BACKUP_FILE ($SIZE)"
else
  echo "❌ Backup failed!"
  exit 1
fi

# Upload to S3 (optional)
if [ -n "$S3_BUCKET" ]; then
  echo "☁️  Uploading to S3: s3://$S3_BUCKET/backups/"
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/" || echo "⚠️  S3 upload failed"
fi

# Remove old backups (keep last N days)
echo "🗑️  Removing backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "✅ Backup process completed!"
```

### Windows Version: `scripts/backup-database.ps1`

```powershell
# Backup PostgreSQL database (Windows)

param(
    [string]$DbName = $env:DATABASE_NAME ?? "zillowlike",
    [string]$DbUser = $env:DATABASE_USER ?? "postgres",
    [string]$DbHost = $env:DATABASE_HOST ?? "localhost",
    [string]$DbPort = $env:DATABASE_PORT ?? "5432",
    [string]$BackupDir = "C:\backups\postgres",
    [int]$RetentionDays = 30
)

# Create backup directory
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# Generate filename
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupDir "${DbName}_${timestamp}.sql"
$compressedFile = "$backupFile.gz"

Write-Host "🔄 Starting backup of database: $DbName" -ForegroundColor Cyan

# Set password environment variable
$env:PGPASSWORD = $env:DATABASE_PASSWORD

# Run pg_dump
& pg_dump `
    -h $DbHost `
    -p $DbPort `
    -U $DbUser `
    -d $DbName `
    --clean `
    --if-exists `
    --no-owner `
    --no-acl `
    -f $backupFile

if ($LASTEXITCODE -eq 0) {
    # Compress with 7zip or gzip (if available)
    if (Get-Command 7z -ErrorAction SilentlyContinue) {
        7z a -tgzip $compressedFile $backupFile
        Remove-Item $backupFile
    }
    
    $size = (Get-Item $compressedFile).Length / 1MB
    Write-Host "✅ Backup created: $compressedFile ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "❌ Backup failed!" -ForegroundColor Red
    exit 1
}

# Cleanup old backups
Write-Host "🗑️  Removing backups older than $RetentionDays days..." -ForegroundColor Yellow
Get-ChildItem -Path $BackupDir -Filter "${DbName}_*.sql*" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } | 
    Remove-Item -Force

Write-Host "✅ Backup process completed!" -ForegroundColor Green
```

---

## ⏰ Schedule Backups (Cron/Task Scheduler)

### Linux/Mac (crontab)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/scripts/backup-database.sh >> /var/log/pg_backup.log 2>&1

# Add weekly full backup (Sundays at 3 AM)
0 3 * * 0 /path/to/scripts/backup-database.sh >> /var/log/pg_backup_weekly.log 2>&1
```

### Windows (Task Scheduler)

```powershell
# Create scheduled task (run as Administrator)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File C:\path\to\scripts\backup-database.ps1"

$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount

Register-ScheduledTask -TaskName "PostgreSQL Daily Backup" `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Description "Daily backup of ZillowLike database"
```

### Docker (cron container)

```yaml
# docker-compose.yml
services:
  backup:
    image: postgres:16-alpine
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - S3_BUCKET=${S3_BACKUP_BUCKET}
    volumes:
      - ./scripts:/scripts
      - backup-data:/backups
    entrypoint: >
      sh -c "
        echo '0 2 * * * /scripts/backup-database.sh' | crontab - &&
        crond -f -l 2
      "
    restart: unless-stopped

volumes:
  backup-data:
```

---

## 🔄 Restore Process

### Restore from backup

```bash
# Linux/Mac
gunzip -c /path/to/backup/zillowlike_20251017_020000.sql.gz | \
  PGPASSWORD="$DATABASE_PASSWORD" psql \
    -h localhost \
    -p 5432 \
    -U postgres \
    -d zillowlike

# Windows
# Decompress first, then:
$env:PGPASSWORD = $env:DATABASE_PASSWORD
psql -h localhost -p 5432 -U postgres -d zillowlike -f backup.sql
```

### Restore with Docker

```bash
# Copy backup into container
docker cp backup.sql.gz zillowlike-postgres-1:/tmp/

# Restore
docker exec zillowlike-postgres-1 sh -c \
  "gunzip -c /tmp/backup.sql.gz | psql -U postgres -d zillowlike"
```

---

## ☁️ Cloud Storage (S3/Azure/GCS)

### AWS S3

```bash
# Upload
aws s3 cp backup.sql.gz s3://your-bucket/backups/

# Download
aws s3 cp s3://your-bucket/backups/backup.sql.gz ./

# List backups
aws s3 ls s3://your-bucket/backups/
```

### Azure Blob Storage

```bash
# Upload
az storage blob upload \
  --account-name youraccount \
  --container-name backups \
  --name backup.sql.gz \
  --file backup.sql.gz

# Download
az storage blob download \
  --account-name youraccount \
  --container-name backups \
  --name backup.sql.gz \
  --file backup.sql.gz
```

---

## 📊 Monitoring & Alerts

### Check backup success

```bash
#!/bin/bash
# Check if backup exists and is recent

BACKUP_DIR="/var/backups/postgres"
MAX_AGE_HOURS=25  # 1 day + buffer

LATEST=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime -1 | head -n1)

if [ -z "$LATEST" ]; then
  echo "❌ No recent backup found!" | mail -s "Backup Alert" admin@example.com
  exit 1
else
  echo "✅ Latest backup: $LATEST"
fi
```

### Slack/Discord Notification

```bash
# Add to backup script
if [ $? -eq 0 ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"✅ Database backup completed successfully"}' \
    YOUR_SLACK_WEBHOOK_URL
fi
```

---

## 🧪 Verify Backups

### Test restore monthly

```bash
#!/bin/bash
# Test restore to temporary database

TEST_DB="zillowlike_test_restore"
LATEST_BACKUP=$(ls -t /var/backups/postgres/*.sql.gz | head -n1)

echo "Testing restore of: $LATEST_BACKUP"

# Create test database
createdb -U postgres $TEST_DB

# Restore
gunzip -c "$LATEST_BACKUP" | psql -U postgres -d $TEST_DB

# Verify (check table count, row count, etc.)
TABLE_COUNT=$(psql -U postgres -d $TEST_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")

if [ "$TABLE_COUNT" -gt 10 ]; then
  echo "✅ Restore test passed ($TABLE_COUNT tables)"
else
  echo "❌ Restore test failed (only $TABLE_COUNT tables)"
fi

# Cleanup
dropdb -U postgres $TEST_DB
```

---

## 📝 Backup Checklist

### Daily
- [x] Automated backup runs at 2 AM
- [x] Backup uploaded to cloud storage
- [x] Old backups cleaned up (>30 days)
- [x] Backup log verified

### Weekly
- [ ] Verify latest backup integrity
- [ ] Check backup file sizes (detect anomalies)
- [ ] Review backup logs for errors

### Monthly
- [ ] Test restore to temporary database
- [ ] Verify all tables and data integrity
- [ ] Document any issues

### Quarterly
- [ ] Full disaster recovery drill
- [ ] Update restore documentation
- [ ] Review backup retention policy

---

## 🆘 Disaster Recovery

### Scenario 1: Database Corruption

1. Stop application
   ```bash
   docker-compose stop app worker
   ```

2. Restore from latest backup
   ```bash
   gunzip -c /backups/latest.sql.gz | psql -U postgres -d zillowlike
   ```

3. Verify data integrity
   ```bash
   psql -U postgres -d zillowlike -c "SELECT COUNT(*) FROM properties"
   ```

4. Restart application
   ```bash
   docker-compose up -d
   ```

### Scenario 2: Complete Server Loss

1. Provision new server
2. Install Docker + Docker Compose
3. Clone repository
4. Download latest backup from S3
5. Restore database
6. Start services
7. Verify health endpoints

**Expected RTO**: 2-4 hours  
**Expected RPO**: < 24 hours (daily backups)

---

## 📚 References

- [PostgreSQL Backup & Restore](https://www.postgresql.org/docs/current/backup.html)
- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Docker PostgreSQL Backups](https://docs.docker.com/samples/postgresql_service/)

---

**Last Updated**: 2025-10-17  
**Maintainer**: DevOps Team  
**Review Frequency**: Quarterly
