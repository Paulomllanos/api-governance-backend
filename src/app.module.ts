import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ApisModule } from './apis/apis.module.js';
import { VersionsModule } from './versions/versions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ApisModule,
    VersionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
