# Demo Usage Guide (Backend V1)

This guide explains how to populate and reset the demo data for development and manual testing.

## Fixed Demo IDs
Use these IDs when calling the API endpoints:
- **Professional ID:** `f47ac10b-58cc-4372-a567-0e02b2c3d479`
- **Service ID:** `b2d9b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d1a`

## Known Demo Dates
The seed data is designed for these specific dates:
- **Monday, 2026-03-23:** Includes 2 confirmed appointments and a lunch break (12:00-13:00).
- **Saturday, 2026-03-28:** Defined working hours (10:00-14:00) with no bookings.

## SQL Scripts

### 1. `backend/demo-seed.sql`
**When to run:** To populate a fresh environment or restore the demo state.
**How to validate:**
- `GET /v1/availability/f47ac10b-58cc-4372-a567-0e02b2c3d479?service_id=b2d9b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d1a&date=2026-03-23`
- Should show slots excluding 09:00, 10:00, and the 12:00-13:00 window.

### 2. `backend/reset-demo.sql`
**When to run:** Before re-seeding to avoid conflicts, or to clean up demo data without touching other records.
**Safe Order:** The script automatically handles foreign key constraints by deleting in the correct order (Appointments -> Blocked Slots -> Rules -> Clients -> Services -> Professionals).

## Recommended Workflow
1. Run `reset-demo.sql` via Supabase SQL Editor or CLI.
2. Run `demo-seed.sql`.
3. Test availability and list appointments using the IDs above.
