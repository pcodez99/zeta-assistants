import { Controller, Post, Get, Body, Query, Headers, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { Public } from '../auth/decorators/public.decorators';
import { SensorReportInputSchema, SensorReportInput } from '@repo/schema';

@Controller('weather')
export class WeatherController {
  constructor(private weatherService: WeatherService) {}

  @Public()
  @Post('report')
  async reportReading(
    @Headers('x-api-key') apiKey: string,
    @Body() body: SensorReportInput,
  ) {
    const configuredApiKey = process.env.WEATHER_API_KEY;
    if (!apiKey || apiKey !== configuredApiKey) {
      throw new UnauthorizedException('Invalid or missing weather API key');
    }

    const validation = SensorReportInputSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException(validation.error.flatten().fieldErrors);
    }

    return this.weatherService.recordReading(validation.data);
  }

  @Get('latest')
  async getLatest() {
    return { reading: await this.weatherService.getLatest() };
  }

  @Get('history')
  async getHistory(@Query('range') range: string = '24h') {
    return this.weatherService.getHistory(range);
  }
}
