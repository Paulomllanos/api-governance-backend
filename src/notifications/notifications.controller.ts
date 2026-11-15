import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@Req() req: AuthenticatedRequest) { return this.notifications.list(req.user!); }
  @Patch(':id/read') read(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.notifications.markRead(req.user!, id);
  }
}
