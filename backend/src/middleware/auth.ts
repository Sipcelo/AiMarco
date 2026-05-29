import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { supabase } from '../lib/supabase.js';

// AuthContext — dados do usuário autenticado
export interface AuthContext {
  userId: string;         // auth.users.id (Supabase Auth)
  professionalId: string; // professionals.id
}

// Type augmentation para FastifyRequest
declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

// Rotas de API protegidas que EXIGEM autenticação
const PROTECTED_ROUTES: RegExp[] = [
  /^\/v1\/professionals\//,
  /^\/v1\/appointments\/[^/]+\//,
];

// Apenas rotas /v1/ que não são de auth/public precisam de token
function isProtectedRoute(url: string): boolean {
  if (!url.startsWith('/v1/')) return false;        // frontend, health → público
  if (url.startsWith('/v1/auth/')) return false;    // login/signup → público
  if (url.startsWith('/v1/public/')) return false;  // perfil público → público
  if (url.startsWith('/v1/availability/')) return false;
  if (url === '/v1/appointments') return false;
  return PROTECTED_ROUTES.some(pattern => pattern.test(url));
}

// Plugin de autenticação Fastify
async function authPlugin(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Apenas rotas protegidas precisam de token
    if (!isProtectedRoute(request.url)) {
      return;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Token de autenticação não fornecido.' });
      return;
    }

    const token = authHeader.slice(7);

    // Rejeitar tokens com caracteres de controle antes de chegar ao Supabase client
    // (previne TypeError: Headers.append ... invalid header value no log)
    if (/[\x00-\x1F\x7F]/.test(token)) {
      reply.code(401).send({ error: "Token inválido ou expirado." });
      return;
    }

    // Validar JWT com Supabase (server-side)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      reply.code(401).send({ error: 'Token inválido ou expirado.' });
      return;
    }

    // Buscar professional vinculado ao auth_user_id
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (profError || !professional) {
      reply.code(403).send({ error: 'Profissional não encontrado para este usuário.' });
      return;
    }

    // Anexar AuthContext ao request
    request.auth = {
      userId: user.id,
      professionalId: professional.id,
    };
  });
}

// Export como plugin Fastify
export default fp(authPlugin, {
  name: 'auth-plugin',
  fastify: '5.x',
});
