import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';
import { UsersService } from '../users/users.service.js';
import { ChangePasswordDto, UpdateProfileDto } from './profile.dto.js';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly users: UsersService) {}
  @Get() get(@Req() request: AuthenticatedRequest) { return this.users.getPublicProfile(request.user!.id); }
  @Patch() update(@Req() request: AuthenticatedRequest, @Body() body: UpdateProfileDto) {
    return this.users.updateProfile(request.user!.id, body);
  }
  @Post('change-password')
  changePassword(@Req() request: AuthenticatedRequest, @Body() body: ChangePasswordDto) {
    return this.users.changePassword(request.user!.id, body);
  }
}
