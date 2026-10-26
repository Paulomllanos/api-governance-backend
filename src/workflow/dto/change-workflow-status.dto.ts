
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  WorkflowStatus,
} from '@prisma/client';

export class ChangeWorkflowStatusDto {
  @IsEnum(WorkflowStatus, {
    message: 'El estado solicitado no es válido.',
  })
  toStatus!: WorkflowStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
