# Database RPC: create_appointment_v1

## 1. Function Name
`create_appointment_v1`

## 2. Input Parameters
- `p_professional_id`: UUID
- `p_service_id`: UUID
- `p_scheduled_at`: TIMESTAMPTZ
- `p_client_name`: TEXT
- `p_client_phone`: TEXT

## 3. Return Shape
A JSON object representing the newly created appointment:
```json
{
  "id": "uuid",
  "professional_id": "uuid",
  "service_id": "uuid",
  "client_id": "uuid",
  "scheduled_at": "timestamp",
  "status": "confirmed"
}
```

## 4. High-Level Algorithm (Atomic Steps)
1. **Service Validation:** Fetch `duration_minutes` for the given `p_service_id` and verify it belongs to `p_professional_id` and is active.
2. **Time Calculation:** Calculate `p_ends_at` by adding `duration_minutes` to `p_scheduled_at`.
3. **Working Hours Check:** Verify that the entire window (`p_scheduled_at` to `p_ends_at`) falls within a valid `availability_rule` for that professional and day of week.
4. **Conflict Check (Overlap):**
   - Check against existing `appointments` for the professional with status `confirmed`.
   - Check against `blocked_slots` for the professional.
   - If any overlap exists, abort.
5. **Client Management:**
   - Search for a client with `p_professional_id` and `p_client_phone`.
   - If found, use `client_id`.
   - If not found, insert a new record and return the new `client_id`.
6. **Appointment Insertion:** Insert the new appointment with status `confirmed`.
7. **Finalization:** Return the inserted record as JSON.

## 5. Conflict/Error Behavior
- **Service Error:** If the service is invalid or not owned by the professional, raise an exception or return a specific error code (e.g., "SERVICE_NOT_FOUND").
- **Availability Error:** If the slot is outside working hours, overlaps with an appointment, or overlaps with a blocked slot, raise an exception or return a specific error code (e.g., "SLOT_NOT_AVAILABLE").
- **Concurrency:** Because this runs as a single Postgres function, the transaction isolation level ensures that no two calls can successfully book overlapping slots simultaneously.
