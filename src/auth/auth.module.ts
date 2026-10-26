
import { Module } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';

import { JwtModule } from '@nestjs/jwt';

import { UsersModule } from '../users/users.module.js';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

import {
  AuthSessionsService,
} from './auth-sessions.service.js';

@Module({
  imports: [
    ConfigModule,

    UsersModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (config: ConfigService) => {
        const secret = config.get<string>(
          'AUTH_JWT_SECRET',
        );

        if (!secret || secret.length < 32) {
          throw new Error(
            'AUTH_JWT_SECRET debe contener un secreto seguro.',
          );
        }

        return {
          secret,

          signOptions: {
            expiresIn: '15m' as const,
            issuer: 'api-governance-platform',
            audience: 'api-governance-frontend',
          },

          verifyOptions: {
            issuer: 'api-governance-platform',
            audience: 'api-governance-frontend',
          },
        };
      },
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    AuthSessionsService,
    JwtAuthGuard,
  ],

  exports: [
    JwtModule,
    AuthService,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
