#!/bin/bash

# ✅ AUTOMATED FIRESTORE BACKUPS
# Ejecutar diariamente a las 02:00 UTC con Cloud Scheduler
# Requisitos: gcloud CLI, Firebase Admin SDK

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PROJECT_ID="origen-uno"
BACKUP_BUCKET="gs://origen-backups-firestore"
LOG_FILE="/tmp/firestore-backup-${TIMESTAMP}.log"

echo "Starting Firestore backup at ${TIMESTAMP}" | tee $LOG_FILE

# Verificar que GCS bucket existe
if ! gsutil ls $BACKUP_BUCKET > /dev/null 2>&1; then
  echo "ERROR: Backup bucket $BACKUP_BUCKET does not exist" | tee -a $LOG_FILE
  exit 1
fi

# Exportar Firestore
echo "Exporting Firestore collections..." | tee -a $LOG_FILE
gcloud firestore export ${BACKUP_BUCKET}/${TIMESTAMP} \
  --async \
  --project=$PROJECT_ID \
  2>&1 | tee -a $LOG_FILE

if [ $? -ne 0 ]; then
  echo "ERROR: Firestore export failed" | tee -a $LOG_FILE
  # Enviar alerta a Slack
  curl -X POST \
    -H 'Content-type: application/json' \
    --data "{\"text\":\"🔴 FIRESTORE BACKUP FAILED at ${TIMESTAMP}\",\"channel\":\"#alerts\"}" \
    $SLACK_WEBHOOK_URL
  exit 1
fi

echo "Firestore backup completed successfully" | tee -a $LOG_FILE

# Limpiar backups antiguos (> 90 días)
echo "Cleaning old backups (older than 90 days)..." | tee -a $LOG_FILE
CUTOFF_DATE=$(date -d "90 days ago" +%Y%m%d 2>/dev/null || date -v-90d +%Y%m%d)

gsutil ls $BACKUP_BUCKET | grep -E '[0-9]{8}' | while read -r backup_path; do
  backup_date=$(echo $backup_path | grep -oE '[0-9]{8}' | tail -1)
  if [[ $backup_date -lt $CUTOFF_DATE ]]; then
    echo "Removing old backup: $backup_path" | tee -a $LOG_FILE
    gsutil -m rm -r "$backup_path" 2>&1 | tee -a $LOG_FILE
  fi
done

echo "Backup cleanup completed" | tee -a $LOG_FILE

# Enviar notificación a Slack
curl -X POST \
  -H 'Content-type: application/json' \
  --data "{\"text\":\"✅ Firestore backup completed successfully\",\"channel\":\"#alerts\"}" \
  $SLACK_WEBHOOK_URL

echo "Done!" | tee -a $LOG_FILE
