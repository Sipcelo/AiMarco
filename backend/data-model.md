# AiMarco - Conceptual Data Model (v1)

### Entities

#### **Professional**
*Purpose: Represents the service provider and owner of the schedule.*
- **id**: Unique identifier (UUID).
- **full_name**: Professional's name.
- **phone**: Contact number.
- **email**: Contact email.
- **business_type**: Type of service (e.g., barbershop, nails, hair).

#### **Service**
*Purpose: Defines a specific bookable service offered by a professional.*
- **id**: Unique identifier (UUID).
- **professional_id**: Reference to the owner (Professional).
- **name**: Name of the service.
- **duration_minutes**: How long the service takes.
- **price_cents**: Optional price in cents.

#### **Client**
*Purpose: Represents the guest customer.*
- **id**: Unique identifier (UUID).
- **professional_id**: Reference to the professional who "owns" this client record in v1.
- **full_name**: Client's name.
- **phone**: Client's phone number.

#### **AvailabilityRule**
*Purpose: Defines recurring weekly working hours.*
- **id**: Unique identifier (UUID).
- **professional_id**: Reference to the professional.
- **day_of_week**: Day index (0-6).
- **start_time**: Opening time (e.g., "09:00").
- **end_time**: Closing time (e.g., "18:00").

#### **BlockedSlot**
*Purpose: Defines one-off unavailable time windows.*
- **id**: Unique identifier (UUID).
- **professional_id**: Reference to the professional.
- **starts_at**: Start timestamp.
- **ends_at**: End timestamp.
- **reason**: Optional description.

#### **Appointment**
*Purpose: Represents a confirmed booking.*
- **id**: Unique identifier (UUID).
- **professional_id**: Reference to the professional.
- **client_id**: Reference to the guest client.
- **service_id**: Reference to the service booked.
- **scheduled_at**: Start timestamp.
- **status**: Current state (e.g., confirmed, cancelled).

### Essential Relationships

- **Professional** -> **Services** (One-to-Many)
- **Professional** -> **AvailabilityRules** (One-to-Many)
- **Professional** -> **BlockedSlots** (One-to-Many)
- **Professional** -> **Clients** (One-to-Many)
- **Appointment** links **Professional**, **Client**, and **Service**.
