
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  createHash,
  randomBytes,
} from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service.js';

export const REFRESH_TOKEN_TTL_MS =
  7 * 24 * 60 * 60 * 1000;

function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

function hashRefreshToken(token: string): string {
  return createHash('sha256')
    .update(token, 'utf8')
    .digest('hex');
}

@Injectable()
export class AuthSessionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createSession(userId: string) {
    const refreshToken = generateRefreshToken();

    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_MS,
    );

    const session = await this.prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash: hashRefreshToken(refreshToken),
        expiresAt,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });

    return {
      sessionId: session.id,
      refreshToken,
      expiresAt: session.expiresAt,
    };
  }

  async rotateSession(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Sesión requerida.');
    }

    const currentHash = hashRefreshToken(refreshToken);
    const now = new Date();

    const session = await this.prisma.authSession.findUnique({
      where: {
        refreshTokenHash: currentHash,
      },
      include: {
        user: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt <= now ||
      !session.user.isActive
    ) {
      throw new UnauthorizedException(
        'Sesión inválida o expirada.',
      );
    }

    const nextRefreshToken = generateRefreshToken();
    const nextHash = hashRefreshToken(nextRefreshToken);

    // La rotación no extiende la expiración máxima
    // de esta sesión: sigue siendo de 7 días.
    const result = await this.prisma.authSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: currentHash,
        revokedAt: null,
        expiresAt: { gt: now },
        user: {
          is: {
            isActive: true,
          },
        },
      },
      data: {
        refreshTokenHash: nextHash,
        lastUsedAt: now,
      },
    });

    // Si otra solicitud ya utilizó este token,
    // no permitimos reutilizarlo.
    if (result.count !== 1) {
      throw new UnauthorizedException(
        'El refresh token ya no es válido.',
      );
    }

    return {
      userId: session.userId,
      refreshToken: nextRefreshToken,
      expiresAt: session.expiresAt,
    };
  }

  async revokeSession(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenHash: hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
