
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';

import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';

import {
  RequirePermissions,
} from '../authorization/decorators/require-permissions.decorator.js';

import type {
  AuthenticatedRequest,
} from '../auth/guards/jwt-auth.guard.js';

@Controller()
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) { }


  @Post('versions/:versionId/documents')
  @RequirePermissions('documents:upload')
  create(
    @Param('versionId', new ParseUUIDPipe())
    versionId: string,

    @Body()
    data: CreateDocumentDto,

    @Req()
    request: AuthenticatedRequest,
  ) {
    const actor = request.user;

    if (!actor) {
      throw new UnauthorizedException(
        'Debes iniciar sesión para cargar documentos.',
      );
    }

    return this.documentsService.create(
      versionId,
      data,
      actor,
    );
  }


  @Get('versions/:versionId/documents')
  @RequirePermissions('versions:read')
  findAll(
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
  ) {
    return this.documentsService.findAll(versionId);
  }

  @Get('documents/:documentId')
  @RequirePermissions('documents:read')
  findOne(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ) {
    return this.documentsService.findOne(documentId);
  }
}
