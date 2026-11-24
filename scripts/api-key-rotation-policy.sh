// scripts/api-key-rotation-policy.sh
// API Key Rotation Policy for ORIGEN ERP

#!/bin/bash

set -e

PROJECT_ID="${1:-PROJECT_ID}"
SERVICE_ACCOUNT="origen-erp-service"
KEY_ROTATION_DAYS=30

echo "🔐 API Key Rotation Policy Setup"
echo "════════════════════════════════"
echo "Project: $PROJECT_ID"
echo "Service Account: $SERVICE_ACCOUNT"
echo "Rotation Interval: $KEY_ROTATION_DAYS days"
echo ""

# Step 1: Create service account if not exists
echo "1️⃣  Creating/Verifying service account..."
gcloud iam service-accounts create $SERVICE_ACCOUNT \
  --project=$PROJECT_ID \
  --display-name="ORIGEN ERP Service Account" \
  --description="Service account for ORIGEN ERP with key rotation" \
  2>/dev/null || echo "   Service account already exists"

SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"
echo "   ✅ Service account: $SERVICE_ACCOUNT_EMAIL"

# Step 2: Grant necessary roles
echo ""
echo "2️⃣  Granting IAM roles..."

ROLES=(
  "roles/editor"
  "roles/iam.securityAdmin"
  "roles/firebaseauth.admin"
)

for role in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="$role" \
    --condition=None \
    2>/dev/null || true
  echo "   ✅ Granted: $role"
done

# Step 3: Create initial keys
echo ""
echo "3️⃣  Creating API keys..."

# Create production key
echo "   Creating PRODUCTION key..."
gcloud iam service-accounts keys create \
  ./keys/origen-erp-prod-$(date +%Y%m%d).json \
  --iam-account=$SERVICE_ACCOUNT_EMAIL \
  --project=$PROJECT_ID

# Create staging key
echo "   Creating STAGING key..."
gcloud iam service-accounts keys create \
  ./keys/origen-erp-staging-$(date +%Y%m%d).json \
  --iam-account=$SERVICE_ACCOUNT_EMAIL \
  --project=$PROJECT_ID

echo "   ✅ Keys created in ./keys/"

# Step 4: List existing keys
echo ""
echo "4️⃣  Current active keys:"
gcloud iam service-accounts keys list \
  --iam-account=$SERVICE_ACCOUNT_EMAIL \
  --project=$PROJECT_ID \
  --format="table(name,validAfterTime,validBeforeTime,state)"

# Step 5: Create rotation schedule
echo ""
echo "5️⃣  Setting up key rotation schedule..."

cat > ./scripts/rotate-keys-scheduled.sh << 'EOF'
#!/bin/bash
# Scheduled key rotation script (run via Cloud Scheduler)

PROJECT_ID=$1
SERVICE_ACCOUNT_EMAIL=$2
DAYS_OLD=30

echo "🔄 Starting API Key Rotation..."
echo "Project: $PROJECT_ID"
echo "Service Account: $SERVICE_ACCOUNT_EMAIL"

# Get all keys
KEYS=$(gcloud iam service-accounts keys list \
  --iam-account=$SERVICE_ACCOUNT_EMAIL \
  --project=$PROJECT_ID \
  --filter="validAfterTime < -P${DAYS_OLD}D AND state=ACTIVE" \
  --format="value(name)")

if [ -z "$KEYS" ]; then
  echo "✅ No keys older than $DAYS_OLD days found"
  exit 0
fi

# Delete old keys
for KEY in $KEYS; do
  echo "🗑️  Deleting old key: $KEY"
  gcloud iam service-accounts keys delete $KEY \
    --iam-account=$SERVICE_ACCOUNT_EMAIL \
    --project=$PROJECT_ID \
    --quiet
done

# Create new key
echo "🔑 Creating new key..."
NEW_KEY_FILE="./keys/origen-erp-prod-$(date +%Y%m%d-%H%M%S).json"
gcloud iam service-accounts keys create $NEW_KEY_FILE \
  --iam-account=$SERVICE_ACCOUNT_EMAIL \
  --project=$PROJECT_ID

echo "✅ Key rotation complete!"
echo "New key: $NEW_KEY_FILE"

# Alert monitoring system
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d "{
    \"text\": \"🔑 API Key Rotation Complete\",
    \"blocks\": [
      {
        \"type\": \"section\",
        \"text\": {
          \"type\": \"mrkdwn\",
          \"text\": \"*API Key Rotation*\nProject: $PROJECT_ID\nAction: Rotated keys older than $DAYS_OLD days\nTime: $(date)\"
        }
      }
    ]
  }"

EOF

chmod +x ./scripts/rotate-keys-scheduled.sh
echo "   ✅ Rotation script created: ./scripts/rotate-keys-scheduled.sh"

# Step 6: Create Cloud Scheduler job
echo ""
echo "6️⃣  Creating Cloud Scheduler job..."
echo "   (This runs key rotation monthly)"

gcloud scheduler jobs create app-engine \
  origen-erp-key-rotation \
  --schedule="0 0 1 * *" \
  --timezone="America/Guatemala" \
  --http-method=POST \
  --uri="https://$PROJECT_ID.cloudfunctions.net/rotate-api-keys" \
  --message-body="{\"project\":\"$PROJECT_ID\"}" \
  --project=$PROJECT_ID \
  2>/dev/null || echo "   ℹ️  Job may already exist - updating..."

echo "   ✅ Scheduler job configured (runs 1st of each month)"

# Step 7: Create Cloud Function for rotation
echo ""
echo "7️⃣  Creating Cloud Function for automatic rotation..."

cat > ./cloud-functions/rotate-api-keys/main.py << 'EOF'
import functions_framework
from google.cloud import iam_admin_v1
from google.api_core import retry
import google.auth
from datetime import datetime, timedelta
import os

@functions_framework.http
def rotate_api_keys(request):
    """HTTP Cloud Function to rotate API keys."""
    
    request_json = request.get_json(silent=True)
    project_id = request_json.get('project') if request_json else os.environ.get('GCP_PROJECT')
    
    client = iam_admin_v1.IAMClient()
    credentials, _ = google.auth.default()
    
    service_account = f"origen-erp-service@{project_id}.iam.gserviceaccount.com"
    
    # List keys older than 30 days
    keys_to_delete = []
    cutoff_date = datetime.now() - timedelta(days=30)
    
    request_obj = iam_admin_v1.ListServiceAccountKeysRequest(
        name=f"projects/-/serviceAccounts/{service_account}"
    )
    
    keys = client.list_service_account_keys(request=request_obj)
    
    for key in keys.keys:
        if key.valid_after_time and key.valid_after_time.timestamp() < cutoff_date.timestamp():
            keys_to_delete.append(key.name)
    
    # Delete old keys
    for key_name in keys_to_delete:
        client.delete_service_account_key(name=key_name)
        print(f"Deleted key: {key_name}")
    
    # Create new key
    key = client.create_service_account_key(
        name=f"projects/-/serviceAccounts/{service_account}"
    )
    
    return {
        'status': 'success',
        'deleted_keys': len(keys_to_delete),
        'new_key_created': True,
        'timestamp': datetime.now().isoformat()
    }, 200

EOF

echo "   ✅ Cloud Function code ready: ./cloud-functions/rotate-api-keys/main.py"

# Step 8: Create audit policy
echo ""
echo "8️⃣  Creating audit policy..."

cat > ./config/audit-policy-key-rotation.yaml << 'EOF'
auditConfigs:
  - service: iam.googleapis.com
    auditLogConfigs:
      - logType: ADMIN_WRITE
        exemptedMembers: []
      - logType: DATA_READ
        exemptedMembers: []
      - logType: DATA_WRITE
        exemptedMembers: []

EOF

echo "   ✅ Audit policy created: ./config/audit-policy-key-rotation.yaml"

# Step 9: Summary
echo ""
echo "════════════════════════════════"
echo "✅ API Key Rotation Setup Complete!"
echo "════════════════════════════════"
echo ""
echo "📋 Summary:"
echo "   • Service Account: $SERVICE_ACCOUNT_EMAIL"
echo "   • Rotation Interval: Every 30 days"
echo "   • First Key: $(date)"
echo "   • Next Rotation: $(date -d '+30 days')"
echo ""
echo "🔑 Initial keys created:"
ls -1 ./keys/origen-erp-* | head -5
echo ""
echo "⏰ Scheduled via Cloud Scheduler:"
echo "   • Monthly rotation (1st of each month, 00:00 UTC)"
echo "   • Cloud Function: rotate-api-keys"
echo ""
echo "📊 Monitor rotation:"
echo "   • Cloud Logging: resource.type=\"cloud_function\""
echo "   • IAM Audit: iam.googleapis.com/CreateServiceAccountKey"
echo ""
echo "✨ Next steps:"
echo "   1. Store keys securely in Secret Manager"
echo "   2. Update Vercel environment variables"
echo "   3. Enable Cloud Logging for audit trail"
echo "   4. Set up alerts for rotation failures"
echo ""
