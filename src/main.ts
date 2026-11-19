
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module.js';

import type { NestExpressApplication } from '@nestjs/platform-express';

import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
  );

  app.useBodyParser('json', {
    limit: '2mb',
  });

  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT', 3000);

  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:5173',
  );

  app.use(cookieParser());

  // Prefijo global de nuestra API REST
  app.setGlobalPrefix('api/v1');

  // Configuración CORS para React
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validación global de solicitudes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);

  console.log(
    `API Governance Backend ejecutándose en http://localhost:${port}/api/v1`,
  );
}

void bootstrap();
