import { NotificationsModule } from './notifications/notifications.module.js';
import { SearchModule } from './search/search.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { AdminUsersModule } from './admin-users/admin-users.module.js';
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

import { FindingsModule } from './findings/findings.module.js';

import { AuditModule } from './audit/audit.module.js';

import {
  DashboardModule,
} from './dashboard/dashboard.module.js';

import { UsersModule } from './users/users.module.js';



@Module({
  imports: [
    NotificationsModule,
    SearchModule,
    ProfileModule,
    AdminUsersModule,
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
    FindingsModule,
    AuditModule,
    DashboardModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
