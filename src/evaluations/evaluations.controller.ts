
import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
} from '@nestjs/common';

import { EvaluationsService } from './evaluations.service.js';

@Controller()
export class EvaluationsController {
    constructor(
        private readonly evaluationsService: EvaluationsService,
    ) { }

    @Post('documents/:documentId/evaluations')
    create(
        @Param('documentId', ParseUUIDPipe)
        documentId: string,
    ) {
        return this.evaluationsService.create(documentId);
    }

    @Get('documents/:documentId/evaluations')
    findByDocument(
        @Param('documentId', ParseUUIDPipe)
        documentId: string,
    ) {
        return this.evaluationsService.findByDocument(
            documentId,
        );
    }

    @Get('evaluations')
    findAll() {
        return this.evaluationsService.findAll();
    }

    @Get('evaluations/:id')
    findOne(
        @Param('id', ParseUUIDPipe)
        id: string,
    ) {
        return this.evaluationsService.findOne(id);
    }


    @Post('evaluations/:id/execute')
    execute(
        @Param('id', ParseUUIDPipe)
        id: string,
    ) {
        return this.evaluationsService.execute(id);
    }

}
