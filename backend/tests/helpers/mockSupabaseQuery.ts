import { vi } from "vitest";

/**
 * Creates a chainable Supabase query mock covering the full chain:
 * .select().eq().gte().lte().order()
 *
 * Usage:
 *   vi.spyOn(supabase, 'from').mockReturnValue(buildChain({ data: [...], error: null }));
 */
export function buildChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "neq", "gte", "lte", "gt", "lt", "order", "limit", "single", "maybeSingle", "in", "not", "is", "filter", "range", "match"];

  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }

  // Terminal methods that resolve the promise
  (chain as { then: unknown }).then = undefined; // not a thenable itself
  Object.defineProperty(chain, "then", { get: undefined, configurable: true });

  // Make the chain itself act as a promise when awaited
  const promise = Promise.resolve(result);
  for (const m of methods) {
    (chain[m] as ReturnType<typeof vi.fn>).mockImplementation((..._args: unknown[]) => {
      return Object.assign(Promise.resolve(result), chain);
    });
  }

  return Object.assign(Promise.resolve(result), chain) as typeof chain & Promise<typeof result>;
}
