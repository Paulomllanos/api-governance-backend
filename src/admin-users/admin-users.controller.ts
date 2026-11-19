import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator.js';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';
import { UsersService } from '../users/users.service.js';
import { CreateManagedUserDto, UpdateManagedUserDto } from './admin-users.dto.js';

@Controller('users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('users:read')
  list() { return this.users.listManaged(); }

  @Post()
  @RequirePermissions('users:manage')
  create(@Body() body: CreateManagedUserDto, @Req() req: AuthenticatedRequest) { return this.users.createUser(body, req.user!.id); }

  @Patch(':id')
  @RequirePermissions('users:manage')
  update(@Param('id') id: string, @Body() body: UpdateManagedUserDto, @Req() req: AuthenticatedRequest) {
    return this.users.updateManaged(id, body, req.user!.id);
  }
}
