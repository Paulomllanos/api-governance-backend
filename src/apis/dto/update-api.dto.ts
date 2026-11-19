
import {
  IsNotEmpty,
  IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class UpdateApiDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    owner?: string;
}
