
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

@Controller('apis/:apiId/versions')
export class VersionsController {
  constructor(
    private readonly versionsService: VersionsService,
  ) {}

  @Get()
  findAll(
    @Param('apiId', new ParseUUIDPipe()) apiId: string,
  ) {
    return this.versionsService.findAll(apiId);
  }

  @Get(':versionId')
  findOne(
    @Param('apiId', new ParseUUIDPipe()) apiId: string,
    @Param('versionId', new ParseUUIDPipe()) versionId: string,
  ) {
    return this.versionsService.findOne(apiId, versionId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('apiId', new ParseUUIDPipe()) apiId: string,
    @Body() data: CreateVersionDto,
  ) {
    return this.versionsService.create(apiId, data);
  }
}
