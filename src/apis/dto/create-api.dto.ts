
import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateApiDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  owner!: string;
}
