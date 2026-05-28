export interface TimeInterval {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface OccupiedSlot {
  start: string;    // "HH:mm"
  duration: number; // minutes
}

export interface CalculateAvailabilityParams {
  workingIntervals: TimeInterval[];
  appointments: OccupiedSlot[];
  blockedSlots: OccupiedSlot[];
  serviceDuration: number;
  slotGranularity: number;
}

/**
 * Converts "HH:mm" string to minutes from midnight.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight to "HH:mm" string.
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Calculates available start times for a service on a specific date.
 * All inputs are expected to be pre-filtered for the target date.
 */
export function calculateAvailability(params: CalculateAvailabilityParams): string[] {
  const {
    workingIntervals,
    appointments,
    blockedSlots,
    serviceDuration,
    slotGranularity,
  } = params;

  const availableSlots: string[] = [];

  // Combine all occupied intervals into a single list for easier checking
  const occupiedIntervals = [...appointments, ...blockedSlots].map((slot) => {
    const start = timeToMinutes(slot.start);
    return {
      start,
      end: start + slot.duration,
    };
  });

  for (const interval of workingIntervals) {
    const intervalStart = timeToMinutes(interval.start);
    const intervalEnd = timeToMinutes(interval.end);

    let currentStart = intervalStart;

    // Check every possible start time based on granularity
    while (currentStart + serviceDuration <= intervalEnd) {
      const currentEnd = currentStart + serviceDuration;

      // Check if this window overlaps with any occupied interval
      const hasOverlap = occupiedIntervals.some(
        (occupied) => currentStart < occupied.end && occupied.start < currentEnd
      );

      if (!hasOverlap) {
        availableSlots.push(minutesToTime(currentStart));
      }

      currentStart += slotGranularity;
    }
  }

  return [...new Set(availableSlots)].sort();
}
