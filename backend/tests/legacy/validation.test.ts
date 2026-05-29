import { test } from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { AppointmentCreateSchema, RescheduleRequestSchema, BlockedSlotCreateSchema } from '../../src/lib/schemas.js';
import { ZodError } from 'zod';

test('Validation Schema - AppointmentCreateSchema rejects invalid UUID', async () => {
  const result = await AppointmentCreateSchema.safeParseAsync({
    professional_id: 'not-a-uuid',
    service_id: 'not-a-uuid',
    scheduled_at: '2026-03-23T10:00:00Z',
    client_name: 'J', // 1 char, will fail min(2)
    client_phone: '123' // 3 digits, will fail min(8)
  });

  assert.strictEqual(result.success, false);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    assert.ok(errors.professional_id);
    assert.ok(errors.service_id);
    assert.ok(errors.client_name);
    assert.ok(errors.client_phone);
  }
});

test('Validation Schema - RescheduleRequestSchema rejects invalid date', async () => {
  const result = await RescheduleRequestSchema.safeParseAsync({
    new_scheduled_at: 'invalid-date'
  });

  assert.strictEqual(result.success, false);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    assert.ok(errors.new_scheduled_at);
  }
});

test('Validation Schema - BlockedSlotCreateSchema rejects ends_at before starts_at', async () => {
  const result = await BlockedSlotCreateSchema.safeParseAsync({
    starts_at: '2026-03-23T12:00:00Z',
    ends_at: '2026-03-23T10:00:00Z',
    reason: 'Testing'
  });

  assert.strictEqual(result.success, false);
  if (!result.success) {
    assert.strictEqual(result.error.issues[0].message, 'ends_at deve ser posterior a starts_at.');
  }
});

// Since we already have integration tests for the routes, 
// and we trust that server.ts uses the schemas correctly (manual check done),
// these unit tests for schemas are the most direct way to prove the validation logic.
