# Manual Test Log - Backend (V1)

| Scenario Name | Input Summary | Expected Result | Observed Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Supabase Health Check** | `GET /health/supabase` | `200 OK` with `{ status: "ok", service: "supabase" }` | Correct response returned | **Passed** |
| **Availability (Valid Day)** | `GET /v1/availability/:id?service_id=:id&date=2026-03-23` | `200 OK` with list of available slots (e.g., `["09:00", ...]`) | Slots returned based on `availability_rules` | **Passed** |
| **Availability (No Rules)** | `GET /v1/availability/:id?service_id=:id&date=2026-03-22` | `200 OK` with empty slots `[]` | No slots returned for day without rules | **Passed** |
| **Create Appointment** | `POST /v1/appointments` (Valid Body) | `201 Created` with appointment object | Appointment inserted and returned | **Passed** |
| **Conflict: Duplicate Booking** | `POST /v1/appointments` (Same slot) | `409 Conflict` with "Selected slot is no longer available." | Double booking blocked by atomic RPC | **Passed** |
| **Conflict: Outside Working Hours** | `POST /v1/appointments` (e.g., 03:00 AM) | `409 Conflict` with "Selected slot is no longer available." | Booking blocked by availability rule check | **Passed** |
| **Blocked Slot Impact** | `blocked_slots` entry + `GET /v1/availability` | Slot removed from availability and `POST` returns `409` | Slot correctly excluded and blocked | **Passed** |
| **Cancel Appointment (Valid)** | `POST /v1/appointments/:id/cancel` | `200 OK` + status changed to `cancelled` | Appointment status updated in DB correctly | **Passed** |
| **List Appointments (Valid Professional/Date)** | `GET /v1/professionals/:id/appointments?date=2026-03-23` | `200 OK` + list of appointments | Correct list of appointments returned | **Passed** |
| **List Appointments (Professional Not Found)** | `GET /v1/professionals/:invalid-id/appointments?date=2026-03-23` | `404 Not Found` | "Professional not found." error returned | **Passed** |
