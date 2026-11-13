
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

import type {
  AuditFilters,
} from './audit.service.js';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
  ) { }

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
    @Query('search') search?: string,
    @Query('api') api?: string,
    @Query('user') user?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,

  ) {

    const filters: AuditFilters = {
      search,
      api,
      user,
      status,
      from,
      to,
    };

    return this.auditService.findAll(
      page,
      limit,
      filters,
    );

  }
}
