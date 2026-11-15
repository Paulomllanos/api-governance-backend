import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminUsersController } from './admin-users.controller.js';

@Module({ imports: [AuthModule, UsersModule], controllers: [AdminUsersController] })
export class AdminUsersModule {}
