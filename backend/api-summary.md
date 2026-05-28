# AiMarco - Backend API Summary (V1)

## Health Check
### GET `/health/supabase`
- **Purpose**: Verify connection and health of Supabase services.
- **Required Inputs**: None.
- **Success Response**: `200 OK` with `{ "status": "ok", "service": "supabase" }`.
- **Main Error Responses**: `500 Internal Server Error`.

---

## Availability
### GET `/v1/availability/:professional_id`
- **Purpose**: Calculate available booking slots for a professional on a specific date for a specific service.
- **Required Inputs**:
  - Path: `professional_id` (UUID)
  - Query: `service_id` (UUID), `date` (YYYY-MM-DD)
- **Success Response**: `200 OK` with `{ "date": "...", "slots": ["09:00", "09:30", ...] }`.
- **Main Error Responses**: 
  - `400 Bad Request` (Invalid/missing input)
  - `404 Not Found` (Service not found/mismatch)

---

## Appointments
### POST `/v1/appointments`
- **Purpose**: Create a new appointment for a professional.
- **Required Inputs**:
  - Body (JSON): `professional_id`, `service_id`, `scheduled_at`, `client_name`, `client_phone`.
- **Success Response**: `201 Created` with the created appointment object.
- **Main Error Responses**:
  - `400 Bad Request` (Missing fields/invalid JSON)
  - `404 Not Found` (Service not found)
  - `409 Conflict` (Slot no longer available/overlapping)

### POST `/v1/appointments/:id/cancel`
- **Purpose**: Cancel an existing confirmed appointment.
- **Required Inputs**:
  - Path: `id` (UUID - Appointment ID)
- **Success Response**: `200 OK` with updated appointment `{ "id": "...", "status": "cancelled" }`.
- **Main Error Responses**:
  - `404 Not Found` (Appointment not found)
  - `409 Conflict` (Appointment cannot be cancelled/wrong status)

### GET `/v1/professionals/:id/appointments`
- **Purpose**: List all appointments for a professional on a specific date.
- **Required Inputs**:
  - Path: `id` (UUID - Professional ID)
  - Query: `date` (YYYY-MM-DD)
- **Success Response**: `200 OK` with array of appointments `[{ "id", "scheduled_at", "status", ... }]`.
- **Main Error Responses**:
  - `400 Bad Request` (Invalid professional ID or date format)
  - `404 Not Found` (Professional not found)
