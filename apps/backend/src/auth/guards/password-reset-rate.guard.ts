import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';

@Injectable()
export class PasswordResetRateGuard implements CanActivate {
  private readonly attempts = new Map<string, { count: number; expires: number }>();

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();
    for (const [key, bucket] of this.attempts) {
      if (bucket.expires <= now) this.attempts.delete(key);
    }
    const key = `${request.ip}:${request.path}`;
    const bucket = this.attempts.get(key) || { count: 0, expires: now + 15 * 60000 };
    if (bucket.count >= 10 || (!this.attempts.has(key) && this.attempts.size >= 10000)) {
      context.switchToHttp().getResponse().setHeader('Retry-After', Math.ceil((bucket.expires - now) / 1000));
      throw new HttpException('Troppe richieste. Riprova tra 15 minuti.', 429);
    }
    bucket.count++;
    this.attempts.set(key, bucket);
    return true;
  }
}
