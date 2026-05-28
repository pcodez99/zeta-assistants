import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): Promise<boolean> | boolean | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // Decode JWT if present, but do not throw error if missing
      const result = super.canActivate(context);
      if (result instanceof Promise) {
        return result.then(() => true).catch(() => true);
      }
      if (result instanceof Observable) {
        return true;
      }
      return true;
    }
    return super.canActivate(context);
  }
}
