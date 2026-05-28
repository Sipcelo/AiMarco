# AiMarco - Availability Rules (v1)

### Required Inputs
- Professional's weekly availability rules (working hours)
- Professional's blocked slots (one-off unavailability)
- Existing appointments for the professional
- Selected date for the lookup
- Service duration (to check if a slot can fit)

### Calculation Steps
1. Filter availability rules for the selected weekday.
2. Identify the working intervals (start/end) for that day.
3. Fetch all blocked slots that overlap with the selected date.
4. Fetch all `confirmed` appointments for the selected date.
5. Generate potential start times within the working intervals.
6. For each potential start time, verify if the service duration fits within the working interval and does not overlap with any blocked slots or `confirmed` appointments.

### Blocking Conditions
A slot is unavailable if:
- It falls outside the professional's defined working hours for that weekday.
- It overlaps with any existing `confirmed` appointment.
- It overlaps with any `blocked_slot`.
- The service duration would extend beyond the current working interval or into a blocked/appointed time.

### Conceptual Output
- A list of available start times (slots) for the selected service on the selected date.

### MVP Note
Slot granularity and specific booking lead times are treated as external policy decisions and are not part of the core availability calculation logic for MVP v1.
