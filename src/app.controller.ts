
import { Controller, Get } from '@nestjs/common';

import { PrismaService } from './prisma/prisma.service.js';

@Controller('health')
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      service: 'api-governance-backend',
      database: 'connected',
    };
  }
}
