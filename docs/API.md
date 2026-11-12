# ConstructERP API Documentation

## Base URL
```
/api
```

## Authentication
All API endpoints require authentication via Firebase Auth token in the Authorization header:
```
Authorization: Bearer <firebase-id-token>
```

## Rate Limiting
API endpoints are rate-limited using persistent storage (Firestore with in-memory fallback):
- Default: 30 requests/minute per user
- Receipt analysis: 20 requests/minute
- Bitácora generation: 10 requests/minute

Rate limit headers returned:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `AUTHENTICATION_ERROR` | 401 | Missing or invalid auth token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `FIRESTORE_ERROR` | 500 | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | 502 | External service (Gemini, etc.) failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `UNKNOWN_ERROR` | 500 | Unclassified error |

## Security Headers
All responses include security headers:
- `Content-Security-Policy`: Restricted to Firebase/Google APIs
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: Limited permissions
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`

## Endpoints

### POST /api/gemini
AI-powered construction assistance for Guatemalan projects.

**Request:**
```json
{
  "action": "chat" | "analyze",
  "message": "string",
  "department": "string (Guatemala department)",
  "projectData": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "reply": "string",
  "source": "gemini-ai" | "guatemala-knowledge-engine"
}
```

### POST /api/gemini/receipt
Analyze receipt/factura images using Gemini Vision.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "supplier": "string",
    "nitSupplier": "string",
    "facturaNumber": "string",
    "amount": "number",
    "category": "string",
    "description": "string"
  }
}
```

### POST /api/gemini/bitacora
Generate Smart Bitácora from foreman voice notes.

**Request:**
```json
{
  "voiceNotes": "string",
  "projectName": "string",
  "capatazName": "string",
  "date": "YYYY-MM-DD"
}
```

**Response:**
```json
{
  "success": true,
  "bitacora": {
    "id": "string",
    "folioNumber": "string",
    "createdAt": "ISO date string",
    "projectName": "string",
    "capatazName": "string",
    "date": "string",
    "weatherConditions": "string",
    "personnelOnSite": "number",
    "tasksCompleted": "string[]",
    "materialsReceived": "string[]",
    "incidentsObservations": "string[]",
    "agiesCompliance": "string",
    "nextDayPlan": "string"
  }
}
```

## Versioning
API versioning is handled via URL path:
- Current: `/api/v1/` (implicit, v1 is default)
- Future versions: `/api/v2/`, etc.

## Changelog
- v1.0.0: Initial API with standardized error handling, rate limiting, and security headers