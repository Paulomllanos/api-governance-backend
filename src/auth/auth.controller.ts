
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import type {
  CookieOptions,
  Request,
  Response,
} from 'express';

import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

import {
  JwtAuthGuard,
} from './guards/jwt-auth.guard.js';

import type {
  AuthenticatedRequest,
} from './guards/jwt-auth.guard.js';

const REFRESH_COOKIE_NAME = 'agp_refresh';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

type RequestWithCookies = Request & {
  cookies?: Record<string, unknown>;
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions(): CookieOptions {
    const isProduction =
      this.configService.get<string>('NODE_ENV') ===
      'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
    };
  }

  private getRefreshToken(
    request: RequestWithCookies,
  ): string {
    const value = request.cookies?.[REFRESH_COOKIE_NAME];

    if (typeof value !== 'string' || !value) {
      throw new UnauthorizedException(
        'No existe una sesión renovable.',
      );
    }

    return value;
  }

  private validateRequestOrigin(request: Request): void {
    const expectedOrigin = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    const origin = request.headers.origin;

    // Los endpoints de cookie requieren un origen
    // explícito y autorizado, incluso si la solicitud
    // no proviene de un navegador.
    if (origin !== expectedOrigin) {
      throw new ForbiddenException(
        'Origen de solicitud no autorizado.',
      );
    }
  }

  @Post('login')
  async login(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    dto: LoginDto,
  ) {
    this.validateRequestOrigin(request);

    const result = await this.authService.login(
      dto.email,
      dto.password,
    );

    response.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      {
        ...this.getCookieOptions(),
        expires: result.refreshExpiresAt,
      },
    );

    return result.response;
  }

  @Post('refresh')
  async refresh(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.validateRequestOrigin(request);

    const refreshToken = this.getRefreshToken(request);

    const result = await this.authService.refresh(
      refreshToken,
    );

    response.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      {
        ...this.getCookieOptions(),
        expires: result.refreshExpiresAt,
      },
    );

    return result.response;
  }

  @Post('logout')
  async logout(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.validateRequestOrigin(request);

    const value = request.cookies?.[REFRESH_COOKIE_NAME];

    try {
      if (typeof value === 'string' && value) {
        await this.authService.logout(value);
      }
    } finally {
      response.clearCookie(
        REFRESH_COOKIE_NAME,
        this.getCookieOptions(),
      );
    }

    return {
      message: 'Sesión cerrada correctamente.',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }
}
