import { join } from 'node:path';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Load environment variables
config({ path: join(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  app.setGlobalPrefix('api');

  const { json, urlencoded } = require('body-parser');
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  const configuredOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3001',
  ]
    .map((origin) => origin?.trim().replace(/\/+$/, ''))
    .filter((origin): origin is string => Boolean(origin));

  const allowedOrigins = Array.from(new Set(configuredOrigins));

  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || process.env.NODE_ENV === 'production') {
        callback(null, true);
        return;
      }
      const normalizedOrigin = origin.replace(/\/+$/, '');
      callback(null, allowedOrigins.includes(normalizedOrigin));
    },
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend running on port ${port}`);
}
bootstrap();
