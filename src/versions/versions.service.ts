
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateVersionDto } from './dto/create-version.dto.js';

@Injectable()
export class VersionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async ensureApiExists(apiId: string): Promise<void> {
    const api = await this.prisma.api.findUnique({
      where: { id: apiId },
      select: { id: true },
    });

    if (!api) {
      throw new NotFoundException(
        `No existe una API con el identificador ${apiId}.`,
      );
    }
  }

  async findAll(apiId: string) {
    await this.ensureApiExists(apiId);

    return this.prisma.apiVersion.findMany({
      where: { apiId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(apiId: string, versionId: string) {
    await this.ensureApiExists(apiId);

    const version = await this.prisma.apiVersion.findFirst({
      where: {
        id: versionId,
        apiId,
      },
    });

    if (!version) {
      throw new NotFoundException(
        'La versión solicitada no existe para esta API.',
      );
    }

    return version;
  }

  async create(apiId: string, data: CreateVersionDto) {
    await this.ensureApiExists(apiId);

    const versionNumber = data.version.trim();

    try {
      return await this.prisma.apiVersion.create({
        data: {
          apiId,
          version: versionNumber,
          description: data.description.trim(),
          status: 'DRAFT',
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `La versión ${versionNumber} ya existe para esta API.`,
        );
      }

      throw error;
    }
  }
}
