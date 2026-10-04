import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import refreshConfig from "../config/refresh.config";
import { ConfigType } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { Request } from "express";

interface AuthJwtPayload {
  sub: string;
  version?: number;
  iat?: number;
  exp?: number;
}

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, "refresh-jwt") {
  constructor(
    @Inject(refreshConfig.KEY)
    private refreshTokenConfig: ConfigType<typeof refreshConfig>,
    private authService: AuthService
  ) {
    if (!refreshTokenConfig.secret) {
      throw new Error("JWT refresh secret is not defined");
    }
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh'),
      secretOrKey: refreshTokenConfig.secret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: AuthJwtPayload) {
    const userId = payload.sub;
    const refreshToken = req.body.refresh;
    const sessionId = req.body.sessionId;
    return this.authService.validateRefreshToken(userId, refreshToken, sessionId, payload.version ?? 0);
  }
}
