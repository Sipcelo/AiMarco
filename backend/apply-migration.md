# Applying the Schema Migration

### How to Apply
1. Open your **Supabase Dashboard**.
2. Navigate to the **SQL Editor** in the left sidebar.
3. Create a **New Query**.
4. Copy the entire content of `backend/supabase-migration-v1.sql`.
5. Paste it into the SQL Editor and click **Run**.

### Verification (Tables)
To confirm the tables were created, run:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```
You should see: `professionals`, `services`, `clients`, `availability_rules`, `blocked_slots`, `appointments`.

### Verification (Constraints)
Run these checks to ensure business rules are enforced:

1. **Unique Client Phone per Professional**:
   ```sql
   -- This should fail on the second insert
   INSERT INTO clients (professional_id, full_name, phone) VALUES ('<some-uuid>', 'John Doe', '123456789');
   INSERT INTO clients (professional_id, full_name, phone) VALUES ('<some-uuid>', 'Jane Doe', '123456789');
   ```

2. **Availability Time Range**:
   ```sql
   -- This should fail (end_time must be > start_time)
   INSERT INTO availability_rules (professional_id, day_of_week, start_time, end_time) 
   VALUES ('<some-uuid>', 1, '18:00', '09:00');
   ```

3. **Invalid Appointment Status**:
   ```sql
   -- This should fail (status not in V1 list)
   INSERT INTO appointments (professional_id, service_id, client_id, scheduled_at, status) 
   VALUES ('<some-uuid>', '<service-uuid>', '<client-uuid>', NOW(), 'pending');
   ```
