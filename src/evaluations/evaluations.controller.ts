
import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Req,
} from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';

import { EvaluationsService } from './evaluations.service.js';

import {
  RequirePermissions,
} from '../authorization/decorators/require-permissions.decorator.js';

@Controller()
export class EvaluationsController {
    constructor(
        private readonly evaluationsService: EvaluationsService,
    ) { }

    @Post('documents/:documentId/evaluations')
    @RequirePermissions('evaluations:create')
    create(
        @Param('documentId', ParseUUIDPipe)
        documentId: string,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.evaluationsService.create(documentId, request.user!);
    }

    @Get('documents/:documentId/evaluations')
    @RequirePermissions('evaluations:read')
    findByDocument(
        @Param('documentId', ParseUUIDPipe)
        documentId: string,
    ) {
        return this.evaluationsService.findByDocument(
            documentId,
        );
    }

    @Get('evaluations')
    @RequirePermissions('evaluations:read')
    findAll() {
        return this.evaluationsService.findAll();
    }

    @Get('evaluations/:id')
    @RequirePermissions('evaluations:read')
    findOne(
        @Param('id', ParseUUIDPipe)
        id: string,
    ) {
        return this.evaluationsService.findOne(id);
    }


    @Post('evaluations/:id/execute')
    @RequirePermissions('evaluations:create')
    execute(
        @Param('id', ParseUUIDPipe)
        id: string,
        @Req() request: AuthenticatedRequest,
    ) {
        return this.evaluationsService.execute(id, request.user!);
    }

}
