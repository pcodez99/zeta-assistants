import { Controller, UseGuards, Get, Put, Request, Post, Body, Req, Res, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Public } from './decorators/public.decorators';
import { RefreshAuthGuard } from './guards/refresh.auth/refresh-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth/google-auth.guard';
import { LoginInput, RegisterInput, ChangePasswordInput, AuthResponse } from '@repo/schema';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Public()
  @Post('login')
  async login(@Request() req, @Body() loginBody: LoginInput) {
    if (!loginBody.email || !loginBody.password) {
      throw new BadRequestException('Email and password are required');
    }
    return this.authService.login(loginBody.email, loginBody.password, req);
  }

  @Public()
  @Post('register')
  async register(@Req() req, @Body() registerBody: RegisterInput) {
    if (!registerBody.email || !registerBody.password || !registerBody.name || !registerBody.username) {
      throw new BadRequestException('All fields (email, password, name, username) are required');
    }
    return this.authService.register(registerBody, req);
  }

  @Public()
  @Post('signout')
  async signOut(@Body() body: { sessionId: string }) {
    if (!body.sessionId) {
      throw new BadRequestException('Session ID is required');
    }
    return this.authService.signOut(body.sessionId);
  }

  @Public()
  @UseGuards(RefreshAuthGuard)
  @Post('refresh')
  async refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user.id, req.user.sessionId);
  }

  @Put('password')
  async changePassword(@Request() req, @Body() body: ChangePasswordInput) {
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('Current and new password are required');
    }
    return this.usersService.changeOwnPassword(req.user.id, body.currentPassword, body.newPassword);
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  async googleLogin() {
    return;
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Request() req, @Res() res) {
    const response = await this.authService.loginFromUserId(req.user.id, req);
    res.redirect(this.buildFrontendCallbackUrl('/auth/google/callback', response));
  }

  @Get('me')
  async getMe(@Request() req) {
    return req.user;
  }

  private buildFrontendCallbackUrl(path: string, response: AuthResponse) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/+$/, '');
    const params = new URLSearchParams({
      userId: response.user.id,
      email: response.user.email,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      username: response.user.username,
      name: response.user.name,
      role: response.user.role,
      sessionId: response.sessionId,
    });
    if (response.user.image) {
      params.set('image', response.user.image);
    }
    return `${frontendUrl}${path}?${params.toString()}`;
  }
}
