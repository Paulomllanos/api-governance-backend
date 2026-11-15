
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import {
  RequirePermissions,
} from '../authorization/decorators/require-permissions.decorator.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @RequirePermissions('users:read')
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('users:manage')
  create(
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.createUser(dto);
  }
}
