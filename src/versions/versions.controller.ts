
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { VersionsService } from './versions.service.js';
import { CreateVersionDto } from './dto/create-version.dto.js';

import {
  RequirePermissions,
} from '../authorization/decorators/require-permissions.decorator.js';

@Controller('apis/:apiId/versions')
export class VersionsController {
  constructor(
    private readonly versionsService: VersionsService,
  ) {}

  @Get()
  @RequirePermissions('versions:read')
  findAll(
    @Param('apiId', new ParseUUIDPipe()) apiId: string,
  ) {
    return this.versionsService.findAll(apiId);
  }

  @Get(':versionId')
  @RequirePermissions('versions:read')
  findOne(
    @Param('apiId', new ParseUUIDPipe()) apiId: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
  ) {
    return this.versionsService.findOne(apiId, versionId);
  }

  @Post()
  @RequirePermissions('versions:create')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('apiId', new ParseUUIDPipe()) apiId: string,
    @Body() data: CreateVersionDto,
  ) {
    return this.versionsService.create(apiId, data);
  }
}
