import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WeatherModule } from './weather/weather.module';
import { HealthController } from './health.controller';
import { SettingsModule } from './settings/settings.module';

// Compute frontend dist path dynamically to support both dev execution and dist/ compilation
let frontendPath = join(__dirname, '..', '..', '..', 'frontend', 'dist');
if (!existsSync(frontendPath)) {
  frontendPath = join(__dirname, '..', '..', 'frontend', 'dist');
}

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: frontendPath,
      exclude: ['/api/(.*)'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WeatherModule,
    SettingsModule,
  ],
})
export class AppModule {}
