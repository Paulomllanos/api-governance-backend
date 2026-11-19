
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @IsIn(['JSON', 'YAML'])
  format!: 'JSON' | 'YAML';

  @IsString()
  @IsNotEmpty()
  content!: string;
}
