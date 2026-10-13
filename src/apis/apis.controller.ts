
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

@Controller('apis')
export class ApisController {
  constructor(
    private readonly apisService: ApisService,
  ) {}

  @Get()
  findAll() {
    return this.apisService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.apisService.findOne(id);
  }

  @Post()
  create(@Body() data: CreateApiDto) {
    return this.apisService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() data: UpdateApiDto,
  ) {
    return this.apisService.update(id, data);
  }
}
