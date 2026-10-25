
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { ApisService } from './apis.service.js';
import { CreateApiDto } from './dto/create-api.dto.js';
import { UpdateApiDto } from './dto/update-api.dto.js';

import {
  RequirePermissions,
} from '../authorization/decorators/require-permissions.decorator.js';

@Controller('apis')
export class ApisController {
  constructor(
    private readonly apisService: ApisService,
  ) {}

  @Get()
  @RequirePermissions('apis:read')
  findAll() {
    return this.apisService.findAll();
  }

  @Get(':id')
  @RequirePermissions('apis:read')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.apisService.findOne(id);
  }

  @Post()
  @RequirePermissions('apis:create')
  create(@Body() data: CreateApiDto) {
    return this.apisService.create(data);
  }

  @Patch(':id')
  @RequirePermissions('apis:update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() data: UpdateApiDto,
  ) {
    return this.apisService.update(id, data);
  }
}
