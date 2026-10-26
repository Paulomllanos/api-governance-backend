
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UnauthorizedException,
} from '@nestjs/common';

import type {
  AuthenticatedRequest,
} from '../auth/guards/jwt-auth.guard.js';

import {
  RequirePermissions,
} from '../authorization/decorators/require-permissions.decorator.js';

import {
  ChangeWorkflowStatusDto,
} from './dto/change-workflow-status.dto.js';

import {
  WorkflowService,
} from './workflow.service.js';

@Controller('apis/:apiId/versions/:versionId/workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
  ) {}

  @Patch()
  @RequirePermissions('versions:read')
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @Param('apiId', ParseUUIDPipe) apiId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: ChangeWorkflowStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const actor = request.user;

    if (!actor) {
      throw new UnauthorizedException(
        'Debes iniciar sesión para continuar.',
      );
    }

    return this.workflowService.changeStatus({
      apiId,
      versionId,
      toStatus: dto.toStatus,
      comment: dto.comment,
      actor,
    });
  }

  @Get('history')
  @RequirePermissions('versions:read')
  findHistory(
    @Param('apiId', ParseUUIDPipe) apiId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.workflowService.findHistory(
      apiId,
      versionId,
    );
  }
}
