# Create Appointment Endpoint (MVP V1)

## Endpoint
- **Method:** `POST`
- **Path:** `/v1/appointments`

## Request Body
```json
{
  "professional_id": "uuid",
  "service_id": "uuid",
  "scheduled_at": "YYYY-MM-DDTHH:mm:ssZ",
  "client_name": "string",
  "client_phone": "string"
}
```

## Success Response
- **Status:** `201 Created`
- **Body:**
```json
{
  "id": "uuid",
  "status": "confirmed"
}
```

## Validation Rules
1. **Required Fields:** `professional_id`, `service_id`, `scheduled_at`, `client_name`, `client_phone` must be present.
2. **Service Ownership:** The `service_id` must exist and belong to the `professional_id`.
3. **Slot Availability:** The system must verify at the moment of booking that:
   - The slot is within the professional's `availability_rules`.
   - The slot does not overlap with any `appointments` where status is `confirmed`.
   - The slot does not overlap with any `blocked_slots`.
   - The check must respect the `duration_minutes` of the requested service.

## Main Error Cases
- **400 Bad Request:** Missing required fields or invalid format (e.g., date, uuid).
- **404 Not Found:** `professional_id` or `service_id` does not exist.
- **409 Conflict:** The slot is no longer available due to a confirmed appointment or blocked time.
- **500 Internal Server Error:** Unexpected system or database error.
