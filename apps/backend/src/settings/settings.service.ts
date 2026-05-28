import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemSettings } from '@repo/schema';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(): Promise<SystemSettings> {
    let settings = await this.prisma.client.systemSettings.findUnique({
      where: { id: 'global' },
    });

    if (!settings) {
      settings = await this.prisma.client.systemSettings.create({
        data: {
          id: 'global',
          esp32Address: '192.168.1.100',
        },
      });
    }

    return settings as unknown as SystemSettings;
  }

  async updateSettings(esp32Address: string): Promise<SystemSettings> {
    return this.prisma.client.systemSettings.upsert({
      where: { id: 'global' },
      update: {
        esp32Address,
      },
      create: {
        id: 'global',
        esp32Address,
      },
    }) as unknown as Promise<SystemSettings>;
  }
}
