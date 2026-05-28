import { Controller, Get, Put, Body, BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsInputSchema, UpdateSettingsInput } from '@repo/schema';

@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  async updateSettings(@Body() body: UpdateSettingsInput) {
    const validation = UpdateSettingsInputSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(validation.error.flatten().fieldErrors);
    }
    return this.settingsService.updateSettings(validation.data.esp32Address);
  }
}
