
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { OpenApiFormat } from '@prisma/client';
import { parseDocument } from 'yaml';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validateOpenApi(
  content: string,
  format: 'JSON' | 'YAML',
): string {
  let parsed: unknown;

  try {
    if (format === 'JSON') {
      parsed = JSON.parse(content) as unknown;
    } else {
      const document = parseDocument(content, {
        uniqueKeys: true,
      });

      if (document.errors.length > 0) {
        throw new Error('El YAML contiene errores.');
      }

      parsed = document.toJS({
        maxAliasCount: 100,
      }) as unknown;
    }
  } catch {
    throw new BadRequestException(
      `El documento no contiene un ${format} válido.`,
    );
  }

  if (!isObject(parsed)) {
    throw new BadRequestException(
      'La raíz del documento OpenAPI debe ser un objeto.',
    );
  }

  const openApiVersion = parsed.openapi;

  if (
    typeof openApiVersion !== 'string' ||
    !/^3\.(0|1)\.\d+$/.test(openApiVersion)
  ) {
    throw new BadRequestException(
      'Solo se admiten especificaciones OpenAPI 3.0.x y 3.1.x.',
    );
  }

  const info = parsed.info;

  if (
    !isObject(info) ||
    typeof info.title !== 'string' ||
    !info.title.trim() ||
    typeof info.version !== 'string' ||
    !info.version.trim()
  ) {
    throw new BadRequestException(
      'OpenAPI debe incluir info.title e info.version válidos.',
    );
  }

  if (!isObject(parsed.paths)) {
    throw new BadRequestException(
      'OpenAPI debe incluir un objeto paths.',
    );
  }

  return openApiVersion;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async ensureVersionExists(
    versionId: string,
  ): Promise<void> {
    const version = await this.prisma.apiVersion.findUnique({
      where: { id: versionId },
      select: { id: true },
    });

    if (!version) {
      throw new NotFoundException(
        'La versión de API solicitada no existe.',
      );
    }
  }

  async create(
    versionId: string,
    data: CreateDocumentDto,
  ) {
    await this.ensureVersionExists(versionId);

    const fileName = data.fileName.trim();

    if (!fileName) {
      throw new BadRequestException(
        'El nombre del archivo es obligatorio.',
      );
    }

    const fileExtension = fileName
      .split('.')
      .pop()
      ?.toLowerCase();

    const validExtension =
      data.format === 'JSON'
        ? fileExtension === 'json'
        : fileExtension === 'yaml' ||
          fileExtension === 'yml';

    if (!validExtension) {
      throw new BadRequestException(
        'La extensión no coincide con el formato declarado.',
      );
    }

    if (Buffer.byteLength(data.content, 'utf8') > 1024 * 1024) {
      throw new BadRequestException(
        'El documento no puede superar 1 MB.',
      );
    }

    const openApiVersion = validateOpenApi(
      data.content,
      data.format,
    );

    return this.prisma.openApiDocument.create({
      data: {
        versionId,
        fileName,
        content: data.content,
        format: data.format as OpenApiFormat,
        openApiVersion,
        isValid: true,
        uploadedBy: 'system-local',
      },
    });
  }

  async findAll(versionId: string) {
    await this.ensureVersionExists(versionId);

    return this.prisma.openApiDocument.findMany({
      where: { versionId },
      select: {
        id: true,
        versionId: true,
        fileName: true,
        format: true,
        openApiVersion: true,
        isValid: true,
        uploadedBy: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(documentId: string) {
    const document = await this.prisma.openApiDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(
        'El documento OpenAPI solicitado no existe.',
      );
    }

    return document;
  }
}
