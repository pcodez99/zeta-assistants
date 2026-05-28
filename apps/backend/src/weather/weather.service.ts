import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SensorReportInput, SensorReading } from '@repo/schema';

@Injectable()
export class WeatherService {
  constructor(private prisma: PrismaService) {}

  async recordReading(data: SensorReportInput): Promise<SensorReading> {
    return this.prisma.client.sensorReading.create({
      data: {
        temperature: data.temperature,
        humidity: data.humidity,
        pressure: data.pressure,
      },
    }) as unknown as Promise<SensorReading>;
  }

  async getHistory(range: string): Promise<SensorReading[]> {
    let since = new Date();
    let downsampleRate = 1; // Take every Nth reading

    if (range === '24h') {
      since.setDate(since.getDate() - 1);
      downsampleRate = 1; // 288 points
    } else if (range === '7d') {
      since.setDate(since.getDate() - 7);
      downsampleRate = 6; // Take every 6th point (approx. every 30 mins) -> 336 points
    } else if (range === '30d') {
      since.setDate(since.getDate() - 30);
      downsampleRate = 24; // Take every 24th point (approx. every 2 hours) -> 360 points
    } else {
      // Default to 24h
      since.setDate(since.getDate() - 1);
    }

    const readings = await this.prisma.client.sensorReading.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (downsampleRate <= 1) {
      return readings as unknown as SensorReading[];
    }

    // Downsample to keep payload small and charts responsive
    return readings.filter((_, idx) => idx % downsampleRate === 0) as unknown as SensorReading[];
  }
}
