# AiMarco - Availability Endpoint (v1)

### HTTP Method
`GET`

### Route Path
`/v1/availability/:professional_id`

### Required Parameters
- Path: `professional_id` (UUID)
- Query: `service_id` (UUID)
- Query: `date` (YYYY-MM-DD)

### Success Response Shape
```json
{
  "date": "2026-03-20",
  "slots": ["09:00", "10:00", "14:30"]
}
```

### Basic Validation Rules
- `professional_id` must be a valid UUID.
- `service_id` must be a valid UUID and belong to the specified professional.
- `date` must follow the `YYYY-MM-DD` format.

### Main Error Cases
- **400 Bad Request**: Missing parameters or invalid format (UUID/Date).
- **404 Not Found**: Professional or Service not found.
- **500 Internal Server Error**: Unexpected server or database error.
