# List Appointments Endpoint (MVP V1)

## HTTP Method
`GET`

## Route Path
`/v1/professionals/:id/appointments`

## Required Parameters
- **Path:** `id` (UUID) - The professional's ID.
- **Query:** `date` (YYYY-MM-DD) - The date to filter appointments.

## Success Response Shape
- **Status:** `200 OK`
- **Body:**
```json
[
  {
    "id": "uuid",
    "scheduled_at": "ISO8601 timestamp",
    "status": "confirmed | cancelled | completed | no_show",
    "service_id": "uuid",
    "client_id": "uuid"
  }
]
```

## Validation Rules
- Professional ID must be a valid UUID.
- Date must be in `YYYY-MM-DD` format.

## Main Error Cases
- **400 Bad Request:** Invalid professional ID or date format.
- **404 Not Found:** Professional does not exist.
- **500 Internal Server Error:** Unexpected database or server error.
