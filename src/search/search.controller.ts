import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator.js';
import { SearchService } from './search.service.js';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}
  @Get()
  @RequirePermissions('apis:read')
  run(@Query('q') q = '') { return this.search.run(q); }
}
