/**
 * Vite plugin: post-build HTML copier for dual-entry deployment.
 *
 * DISABLED: Docker Dockerfile handles asset placement in stage 3.
 * This plugin was causing ENOENT errors in the Railway container.
 */
import type { Plugin } from 'vite'

// Unused imports removed: Dockerfile handles file copying in Docker environments.

export function patchHTML(): Plugin {
  return {
    name: 'patch-html',
    apply: 'build' as const,
    closeBundle() {
      // No-op: Dockerfile copies /web/dist -> ./public at runtime (stage 3).
      // Manual file copying during build breaks in containerized environments.
    },
  }
}
