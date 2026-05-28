import { FastifyRequest, FastifyReply } from "fastify";
import type { IncomingMessage, ServerResponse } from "http";

/**
 * Adapts old-style HTTP handlers (req, res, params) to Fastify handlers
 * Also injects auth context from FastifyRequest into the raw request for access in handlers.
 */
export function adaptHandler(
  handler: (
    req: IncomingMessage & { auth?: any; body?: any }, // extend with auth and parsed body
    res: ServerResponse,
    params: Record<string, string>,
  ) => Promise<void>,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as Record<string, string>;
    // Attach auth and parsed body from FastifyRequest to raw request
    const raw = request.raw as IncomingMessage & { auth?: any; body?: any };
    raw.auth = request.auth;
    raw.body = request.body; // Fastify já parseou o JSON
    return handler(raw, reply.raw, params);
  };
}
