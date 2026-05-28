# Frontend Booking Page Implementation Plan (MVP V1)

## Implementation Layers
1. **API Client Layer:** Define functions for fetching availability and creating appointments using the existing backend endpoints.
2. **State Management Layer:** Use local React state (`useState`, `useEffect`) to manage the booking wizard's progress and data.
3. **UI Component Layer:** Build the mobile-first layouts defined in the UI Blueprint (Service Card, Date Ribbon, Slot Grid, Form).
4. **Integration Layer:** Connect UI components to the state and API functions, handling loading and visibility transitions.

## State + Events
- **`date`:** Updated by `onDateSelect`. Triggers a refresh of available slots.
- **`slots`:** Updated by API response. Resets `selectedSlot` to null on change.
- **`selectedSlot`:** Updated by `onSlotPress`. Required for submission.
- **`formData`:** Updated by `onInputChange`. Required for submission.
- **`bookingStatus`:** Updated by `onSubmit`. Controls the visibility of the Success Screen or Error Alerts.

## API Integration Points
- **Initial Load/Date Change:** 
  - Call `GET /v1/availability/:professional_id?service_id=...&date=...`.
  - Maps to `f47ac10b-58cc-4372-a567-0e02b2c3d479` and `b2d9b2b0-6c9b-4e1a-8b1e-7f8d6e3c5d1a`.
- **Form Submission:**
  - Call `POST /v1/appointments` with the selected date, slot, and client info.

## Success/Error Handling
- **Success (201):** Clear local state and navigate to (or show) the Success/Confirmation View.
- **Conflict (409):** Display "Slot already taken" alert and automatically re-trigger the availability fetch to update the grid.
- **Generic Error (400/500):** Show an inline alert banner with a "Retry" button that re-executes the last failed request.

## Incremental Build Order
1. **Mockup UI:** Build the visual layout with static data to verify touch targets and mobile spacing.
2. **Date Picker Logic:** Implement the horizontal date ribbon and verify that selecting a date updates the `date` state.
3. **Availability Fetching:** Integrate the GET request and render the `Time Slot Grid` dynamically based on the response.
4. **Form & Validation:** Add the name/phone inputs and enable the "Confirm" button only when the form is valid and a slot is selected.
5. **Submission & Results:** Wire up the POST request and implement the "Success Overlay" and conflict error handling.
