# Cancel Appointment Endpoint (MVP V1)

## Endpoint
- **Method:** `POST`
- **Path:** `/v1/appointments/:id/cancel`

## Required Parameters
- **Path:** `id` (UUID) - The appointment ID.

## Success Response
- **Status:** `200 OK`
- **Body:**
```json
{
  "id": "uuid",
  "status": "cancelled"
}
```

## Validation Rules
1. **Existence:** The appointment ID must exist in the database.
2. **Current Status:** Only appointments with status `confirmed` can be cancelled.
3. **Status Update:** The function must update the appointment status to `cancelled`.

## Main Error Cases
- **404 Not Found:** The appointment ID does not exist.
- **409 Conflict:** The appointment is not in `confirmed` status (already `cancelled`, `completed`, or `no_show`).
- **500 Internal Server Error:** Unexpected database or server error.
