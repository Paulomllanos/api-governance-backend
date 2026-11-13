
import {
  Controller,
  Get,
} from '@nestjs/common';

import {
  RequirePermissions,
} from '../authorization/decorators/require-permissions.decorator.js';

import {
  DashboardService,
} from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  @Get('summary')
  @RequirePermissions('apis:read')
  getSummary() {
    return this.dashboardService.getSummary();
  }
}
