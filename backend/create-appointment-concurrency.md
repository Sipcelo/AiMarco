# Appointment Creation Concurrency Design

## 1. The Race Condition
The current implementation follows a **"Check-then-Insert"** pattern in the application layer:
1. Fetch existing appointments and blocked slots.
2. Validate availability in Node.js logic (`canBookSlot`).
3. Insert the new appointment if valid.

Between steps 2 and 3, a concurrent request can successfully validate and insert a conflicting appointment. This is a classic **Time-of-Check to Time-of-Use (TOCTOU)** race condition, resulting in double-bookings.

## 2. Safest Minimal Fix for MVP
Move the atomic **"Validate + Find/Create Client + Insert Appointment"** logic into a single **Postgres Function (RPC)**.

## 3. Proposed Solution: Database RPC
- **Mechanism:** A PL/pgSQL function called via `supabase.rpc()`.
- **Why:** Postgres functions execution is atomic. By wrapping the check and the insert in a single function, Postgres ensures that no other transaction can interfere with the state between the validation and the commit.
- **Why not constraints?** While a Postgres Exclusion Constraint (using `GIST`) is the "purest" way to prevent overlapping ranges, it is complex to implement when service durations are stored in a separate table and requires joining or denormalization.

## 4. Required Changes
Before `createAppointment` can be approved, the following changes are required:
1. **Migration:** Define a Postgres function (e.g., `create_appointment_v1`) that:
   - Takes `professional_id`, `service_id`, `scheduled_at`, `client_name`, and `client_phone`.
   - Performs the availability check (joining `services`, `availability_rules`, and `blocked_slots`).
   - Manages the `clients` table (UPSERT or Select-then-Insert).
   - Inserts the `appointments` record only if no conflicts exist.
2. **Library Update:** The `create-appointment.ts` file must be updated to call this RPC instead of performing multiple separate queries and an insert.
3. **Error Handling:** The library must handle the specific error code/message returned by the database function when a conflict occurs (409 equivalent).
