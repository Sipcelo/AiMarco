import "dotenv/config";
import { buildApp } from "./app.js";
import { config } from "./config.js";

const fastify = await buildApp({ logger: true, serveStatic: true });

try {
  await fastify.listen({ port: config.PORT, host: "0.0.0.0" });
  console.log(`🚀 Server live on port ${config.PORT}`);
} catch (err) {
  console.error("Falha no boot:", err);
  process.exit(1);
}
