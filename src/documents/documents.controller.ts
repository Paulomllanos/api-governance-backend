
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';

import {
  RequirePermissions,
} from '../authorization/decorators/require-permissions.decorator.js';

@Controller()
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) {}

  @Post('versions/:versionId/documents')
  @RequirePermissions('versions:create')
  create(
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
    @Body() data: CreateDocumentDto,
  ) {
    return this.documentsService.create(versionId, data);
  }

  @Get('versions/:versionId/documents')
  @RequirePermissions('versions:read')
  findAll(
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
  ) {
    return this.documentsService.findAll(versionId);
  }

  @Get('documents/:documentId')
  findOne(
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ) {
    return this.documentsService.findOne(documentId);
  }
}
