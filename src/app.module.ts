import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ApisModule } from './apis/apis.module.js';
import { VersionsModule } from './versions/versions.module.js';

import { DocumentsModule } from './documents/documents.module.js';
import { EvaluationsModule } from './evaluations/evaluations.module.js';

import { AuthModule } from './auth/auth.module.js';

import {
  AuthorizationModule,
} from './authorization/authorization.module.js';

import { WorkflowModule } from './workflow/workflow.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ApisModule,
    VersionsModule,
    DocumentsModule,
    EvaluationsModule,
    AuthModule,
    AuthorizationModule,
    WorkflowModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
