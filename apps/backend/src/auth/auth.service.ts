import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import refreshConfig from './config/refresh.config';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import { AuthResponse, RegisterInput } from '@repo/schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(refreshConfig.KEY)
    private refreshTokenConfig: ConfigType<typeof refreshConfig>,
  ) {}

  async validateLocalUser(email: string, pass: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isMatch = bcrypt.compareSync(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { id: user.id, email: user.email, role: user.role };
  }

  async login(email: string, password: string, req: Request): Promise<AuthResponse> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueAuthSession(user, req);
  }

  async loginFromUserId(userId: string, req: Request): Promise<AuthResponse> {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return this.issueAuthSession(user, req);
  }

  async register(input: RegisterInput, req: Request): Promise<AuthResponse> {
    const user = await this.usersService.create(input);
    return this.issueAuthSession(user, req);
  }

  async validateGoogleUser(googleUser: { email: string; name: string; username: string; image?: string }) {
    let user = await this.usersService.findOneByEmail(googleUser.email);
    if (!user) {
      // Find a unique username if the base username is already taken
      let baseUsername = googleUser.username.toLowerCase().replace(/[^a-z0-9]/g, '');
      let username = baseUsername || 'googleuser';
      let attempt = 0;
      while (await this.usersService.findOneByUsername(username)) {
        attempt++;
        username = `${baseUsername}${attempt}`;
      }

      user = await this.usersService.create({
        email: googleUser.email,
        name: googleUser.name,
        username,
        password: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15), // Secure random password
        image: googleUser.image,
      });
    }
    return user;
  }

  async generateTokens(userId: string) {
    const payload = { sub: userId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, this.refreshTokenConfig),
    ]);
    return {
      accessToken,
      refreshToken,
    };
  }

  async validateJwtUser(userId: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found in token');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      username: user.username,
      image: user.image,
    };
  }

  async validateRefreshToken(userId: string, refreshToken: string, sessionId: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const session = await this.usersService.findSessionById(sessionId);
    if (!session) {
      throw new BadRequestException('Session not found');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, session.hashedRefreshToken);
    if (!refreshTokenMatches) {
      throw new BadRequestException('Invalid refresh token');
    }

    return { id: user.id, sessionId: session.id };
  }

  async refreshToken(userId: string, sessionId: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const existingSession = await this.usersService.findSessionById(sessionId);
    if (!existingSession) {
      throw new BadRequestException('Session not found');
    }

    const { accessToken, refreshToken } = await this.generateTokens(userId);
    const hashedRT = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateHashedRefreshToken(sessionId, hashedRT);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role as any,
        image: user.image || undefined,
      },
      accessToken,
      refreshToken,
      sessionId,
    };
  }

  async signOut(sessionId: string) {
    await this.usersService.deleteRefreshToken(sessionId);
    return { message: "logged out" };
  }

  private async issueAuthSession(user: {
    id: string;
    email: string;
    username: string;
    name: string;
    role: string;
    image: string | null;
  }, req: Request): Promise<AuthResponse> {
    const { accessToken, refreshToken } = await this.generateTokens(user.id);
    const hashedRT = await bcrypt.hash(refreshToken, 10);

    const connectionInfo = {
      ip: req?.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req?.socket?.remoteAddress || '',
      userAgent: req?.headers['user-agent'] || 'unknown',
    };

    const session = await this.usersService.createRefreshToken(user.id, hashedRT, connectionInfo);
    if (!session) {
      throw new BadRequestException('Failed to create session');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role as any,
        image: user.image || undefined,
      },
      accessToken,
      refreshToken,
      sessionId: session.id,
    };
  }
}
