# AiMarco - Relational Schema Proposal (v1)

### Tables

#### **professionals**
- **id**: UUID (Primary Key)
- **full_name**: TEXT
- **phone**: TEXT (Unique)
- **email**: TEXT (Unique)
- **business_type**: TEXT (e.g., 'barbershop', 'nails', 'hair')
- **created_at**: TIMESTAMP WITH TIME ZONE

#### **services**
- **id**: UUID (Primary Key)
- **professional_id**: UUID (Foreign Key -> professionals.id)
- **name**: TEXT
- **duration_minutes**: INTEGER
- **price_cents**: INTEGER (Optional)
- **is_active**: BOOLEAN (Default: TRUE)
- **created_at**: TIMESTAMP WITH TIME ZONE

#### **clients**
- **id**: UUID (Primary Key)
- **professional_id**: UUID (Foreign Key -> professionals.id)
- **full_name**: TEXT
- **phone**: TEXT
- **created_at**: TIMESTAMP WITH TIME ZONE
- *Constraint: Unique (professional_id, phone)*

#### **availability_rules**
- **id**: UUID (Primary Key)
- **professional_id**: UUID (Foreign Key -> professionals.id)
- **day_of_week**: INTEGER (0=Sunday, 6=Saturday)
- **start_time**: TIME (e.g., '09:00')
- **end_time**: TIME (e.g., '18:00')
- **created_at**: TIMESTAMP WITH TIME ZONE

#### **blocked_slots**
- **id**: UUID (Primary Key)
- **professional_id**: UUID (Foreign Key -> professionals.id)
- **starts_at**: TIMESTAMP WITH TIME ZONE
- **ends_at**: TIMESTAMP WITH TIME ZONE
- **reason**: TEXT (Optional)
- **created_at**: TIMESTAMP WITH TIME ZONE

#### **appointments**
- **id**: UUID (Primary Key)
- **professional_id**: UUID (Foreign Key -> professionals.id)
- **service_id**: UUID (Foreign Key -> services.id)
- **client_id**: UUID (Foreign Key -> clients.id)
- **scheduled_at**: TIMESTAMP WITH TIME ZONE
- **status**: TEXT (e.g., 'confirmed', 'cancelled', 'completed', 'no_show')
- **created_at**: TIMESTAMP WITH TIME ZONE
- **updated_at**: TIMESTAMP WITH TIME ZONE

### Summary of Key Constraints
- **Referential Integrity**: All child tables link to `professionals.id`.
- **Unique Clients**: A professional cannot have two client records with the same phone number.
- **Appointment Status**: Status field should be restricted to the official V1 statuses.
