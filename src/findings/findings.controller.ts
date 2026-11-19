
import {
  Controller,
  Get,
} from '@nestjs/common';

import {
  RequirePermissions,
} from '../authorization/decorators/require-permissions.decorator.js';

import {
  FindingsService,
} from './findings.service.js';

@Controller('findings')
export class FindingsController {
  constructor(
    private readonly findingsService: FindingsService,
  ) {}

  @Get()
  @RequirePermissions('evaluations:read')
  findAll() {
    return this.findingsService.findAll();
  }
}
