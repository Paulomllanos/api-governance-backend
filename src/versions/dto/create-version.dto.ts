
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, {
    message:
      'La versión debe utilizar el formato MAJOR.MINOR.PATCH, por ejemplo 1.0.0.',
  })
  version!: string;

  @IsString()
  @MaxLength(1000)
  description!: string;
}
