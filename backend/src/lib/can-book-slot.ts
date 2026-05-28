export interface TimeInterval {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface OccupiedSlot {
  start: string;    // "HH:mm"
  duration: number; // minutes
}

export interface CanBookSlotParams {
  requestedStart: string; // "HH:mm"
  serviceDuration: number;
  workingIntervals: TimeInterval[];
  appointments: OccupiedSlot[];
  blockedSlots: OccupiedSlot[];
}

/**
 * Converts "HH:mm" string to minutes from midnight.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Validates if a specific time slot can be booked based on working hours and existing occupations.
 * All inputs are expected to be pre-filtered for the target date.
 */
export function canBookSlot(params: CanBookSlotParams): boolean {
  const {
    requestedStart,
    serviceDuration,
    workingIntervals,
    appointments,
    blockedSlots,
  } = params;

  const start = timeToMinutes(requestedStart);
  const end = start + serviceDuration;

  // 1. Check if the slot is fully within any working interval
  const isWithinWorkingHours = workingIntervals.some((interval) => {
    const intervalStart = timeToMinutes(interval.start);
    const intervalEnd = timeToMinutes(interval.end);
    return start >= intervalStart && end <= intervalEnd;
  });

  if (!isWithinWorkingHours) {
    return false;
  }

  // 2. Combine all occupied intervals for overlap check
  const occupiedIntervals = [...appointments, ...blockedSlots];

  // 3. Check for overlaps with confirmed appointments or blocked slots
  const hasOverlap = occupiedIntervals.some((occupied) => {
    const occupiedStart = timeToMinutes(occupied.start);
    const occupiedEnd = occupiedStart + occupied.duration;

    // Overlap condition: startA < endB AND startB < endA
    return start < occupiedEnd && occupiedStart < end;
  });

  return !hasOverlap;
}
