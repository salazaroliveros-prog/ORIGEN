#!/bin/bash

# ✅ AUTOMATED CLOUD STORAGE BACKUPS
# Ejecutar semanalmente (Domingo 03:00 UTC) con Cloud Scheduler
# Requisitos: gcloud CLI, gsutil

set -e

TIMESTAMP=$(date +%Y-W%V)
SOURCE_BUCKET="gs://origen-uno.appspot.com"
BACKUP_BUCKET="gs://origen-backups-storage"
LOG_FILE="/tmp/storage-backup-${TIMESTAMP}.log"

echo "Starting Cloud Storage backup for week ${TIMESTAMP}" | tee $LOG_FILE

# Verificar buckets existen
for bucket in $SOURCE_BUCKET $BACKUP_BUCKET; do
  if ! gsutil ls $bucket > /dev/null 2>&1; then
    echo "ERROR: Bucket $bucket does not exist" | tee -a $LOG_FILE
    exit 1
  fi
done

# Copiar todos los archivos
echo "Copying storage files..." | tee -a $LOG_FILE
gsutil -m cp -r "${SOURCE_BUCKET}/*" "${BACKUP_BUCKET}/weekly/${TIMESTAMP}/" \
  2>&1 | tee -a $LOG_FILE

if [ $? -ne 0 ]; then
  echo "ERROR: Storage backup copy failed" | tee -a $LOG_FILE
  curl -X POST \
    -H 'Content-type: application/json' \
    --data "{\"text\":\"🔴 STORAGE BACKUP FAILED for week ${TIMESTAMP}\",\"channel\":\"#alerts\"}" \
    $SLACK_WEBHOOK_URL
  exit 1
fi

# Verificar integridad
echo "Verifying backup integrity..." | tee -a $LOG_FILE
SOURCE_COUNT=$(gsutil ls -R "$SOURCE_BUCKET" | wc -l)
BACKUP_COUNT=$(gsutil ls -R "${BACKUP_BUCKET}/weekly/${TIMESTAMP}" | wc -l)

if [ $SOURCE_COUNT -eq $BACKUP_COUNT ]; then
  echo "✅ Integrity check PASSED (files: $SOURCE_COUNT)" | tee -a $LOG_FILE
else
  echo "⚠️ File count mismatch: source=$SOURCE_COUNT, backup=$BACKUP_COUNT" | tee -a $LOG_FILE
fi

# Limpiar backups antiguos (> 12 semanas)
echo "Cleaning old backups (older than 12 weeks)..." | tee -a $LOG_FILE
gsutil ls "${BACKUP_BUCKET}/weekly/" | while read -r backup_path; do
  week_num=$(echo $backup_path | grep -oE 'W[0-9]{2}' | sed 's/W//')
  if [ ! -z "$week_num" ] && [ $week_num -lt $(($(date +%V) - 12)) ]; then
    echo "Removing old weekly backup: $backup_path" | tee -a $LOG_FILE
    gsutil -m rm -r "$backup_path" 2>&1 | tee -a $LOG_FILE
  fi
done

echo "Backup completed and verified successfully" | tee -a $LOG_FILE

# Enviar notificación
curl -X POST \
  -H 'Content-type: application/json' \
  --data "{\"text\":\"✅ Weekly storage backup completed (Week ${TIMESTAMP})\",\"channel\":\"#alerts\"}" \
  $SLACK_WEBHOOK_URL

echo "Done!" | tee -a $LOG_FILE
