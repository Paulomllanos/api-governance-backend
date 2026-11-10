
import {
  Controller,
  Get,
} from '@nestjs/common';

import {
  RequirePermissions,
} from '../authorization/decorators/require-permissions.decorator.js';

import {
  ReviewQueueService,
} from './review-queue.service.js';

@Controller('reviews')
export class ReviewQueueController {
  constructor(
    private readonly reviewQueueService: ReviewQueueService,
  ) {}

  @Get('queue')
  @RequirePermissions('versions:read')
  findAll() {
    return this.reviewQueueService.findAll();
  }
}
