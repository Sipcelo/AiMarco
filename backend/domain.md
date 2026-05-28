# AiMarco - Initial Scheduling Domain (v1)

### Core Entities

- **Professional**: The service provider (barber, nail technician, hair stylist). Owns the schedule and defines the rules.
- **Service**: A specific task offered by a Professional (e.g., "Haircut", "Manicure"). Includes a fixed duration.
- **Client**: The customer receiving the service. Identified by name and phone number (guest-only for v1).
- **Availability Rule**: Recurring weekly windows when the Professional is working (e.g., Monday 9:00-18:00).
- **Blocked Slot**: One-off time windows when the Professional is unavailable (e.g., doctor's appointment).
- **Appointment**: A confirmed booking. Links a Professional, a Client, and a Service to a specific date and time.

### Minimal Relationships

- A **Professional** defines many **Services**.
- A **Professional** has many **Availability Rules**.
- A **Professional** can have many **Blocked Slots**.
- An **Appointment** belongs to one **Professional**, one **Service**, and one **Client**.
- A **Client** is linked to the **Professional** they booked with.

### Smallest Valid Scheduling Flow (MVP)

1. **Setup**: Professional registers their services (with duration) and sets their weekly working hours.
2. **Discovery**: Client accesses the Professional's public page and selects a Service.
3. **Selection**: Client chooses an available date and time slot (calculated based on working hours, existing appointments, and blocked slots).
4. **Identification**: Client enters their name and phone number.
5. **Confirmation**: System validates the slot one last time and creates the Appointment.
