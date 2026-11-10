
import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

import {
  RequirePermissions,
} from '../authorization/decorators/require-permissions.decorator.js';

import {
  AuditService,
} from './audit.service.js';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions('versions:read')
  findAll(
    @Query(
      'page',
      new DefaultValuePipe(1),
      ParseIntPipe,
    )
    page: number,

    @Query(
      'limit',
      new DefaultValuePipe(20),
      ParseIntPipe,
    )
    limit: number,
  ) {
    return this.auditService.findAll(page, limit);
  }
}
