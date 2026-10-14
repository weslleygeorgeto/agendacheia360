import "server-only";

/**
 * Rate limit em memória (por instância). Serve para desenvolvimento e tráfego baixo.
 * TODO produção: trocar por Upstash Redis / @upstash/ratelimit (em serverless a memória
 * não é compartilhada entre instâncias).
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5000) {
    hits.forEach((v, k) => {
      if (v.every((t: number) => now - t >= windowMs)) hits.delete(k);
    });
  }
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
