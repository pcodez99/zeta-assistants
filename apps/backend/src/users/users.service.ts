import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, type Session, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import type { RegisterInput } from '@repo/schema';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(input: RegisterInput): Promise<User> {
    const existingEmail = await this.findOneByEmail(input.email);
    if (existingEmail) {
      throw new BadRequestException('Email already in use');
    }

    const existingUsername = await this.findOneByUsername(input.username);
    if (existingUsername) {
      throw new BadRequestException('Username already in use');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    return this.prisma.client.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        username: input.username.toLowerCase().trim(),
        name: input.name,
        password: hashedPassword,
        image: input.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(input.name)}&background=8956FB&color=fff&rounded=true&format=svg`,
        role: 'user',
      },
    });
  }

  findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.client.user.findFirst({ where: { email: { equals: email.trim(), mode: 'insensitive' } } });
  }

  findOneByUsername(username: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({ where: { username: username.toLowerCase().trim() } });
  }

  findOneById(id: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({ where: { id } });
  }

  async changeOwnPassword(id: string, currentPass: string, newPass: string) {
    const user = await this.findOneById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPass, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id },
        data: { password: hashedPassword, passwordVersion: { increment: 1 }, passwordResetHash: null, passwordResetExpiresAt: null },
      }),
      this.prisma.client.session.deleteMany({ where: { userId: id } }),
    ]);

    return { success: true };
  }

  async updateOwnProfile(id: string, data: { name?: string; email?: string; username?: string }) {
    const existingUser = await this.findOneById(id);
    if (!existingUser) throw new NotFoundException('User not found');

    const updateData: any = {};
    if (data.name) updateData.name = data.name;

    if (data.email && data.email !== existingUser.email) {
      const byEmail = await this.findOneByEmail(data.email);
      if (byEmail) throw new BadRequestException('Email already in use');
      updateData.email = data.email.trim().toLowerCase();
    }

    if (data.username && data.username !== existingUser.username) {
      const byUsername = await this.findOneByUsername(data.username);
      if (byUsername) throw new BadRequestException('Username already in use');
      updateData.username = data.username.toLowerCase().trim();
    }

    return this.prisma.client.user.update({
      where: { id },
      data: updateData,
    });
  }

  // --- Session Management ---
  async findSessionById(sessionId: string): Promise<Session | null> {
    return this.prisma.client.session.findUnique({ where: { id: sessionId } });
  }

  async createRefreshToken(
    userId: string,
    hashedRT: string,
    connectionInfo?: { ip: string; userAgent: string },
  ): Promise<Session> {
    return this.prisma.client.session.create({
      data: {
        userId,
        hashedRefreshToken: hashedRT,
        ip: connectionInfo?.ip,
        userAgent: connectionInfo?.userAgent,
        deviceId: crypto.randomUUID(),
      },
    });
  }

  async updateHashedRefreshToken(sessionId: string, hashedRT: string): Promise<Session> {
    return this.prisma.client.session.update({
      where: { id: sessionId },
      data: {
        hashedRefreshToken: hashedRT,
        updatedAt: new Date(),
      },
    });
  }

  async deleteRefreshToken(sessionId: string) {
    return this.prisma.client.session.deleteMany({ where: { id: sessionId } });
  }
}
