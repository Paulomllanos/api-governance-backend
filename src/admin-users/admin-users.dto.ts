import { ArrayNotEmpty, ArrayUnique, IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { APP_ROLES, type AppRole } from '../authorization/policies/rbac.policy.js';

export class CreateManagedUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) @MaxLength(100) displayName!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
  @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsIn(APP_ROLES, { each: true }) roles!: AppRole[];
}

export class UpdateManagedUserDto {
  @IsOptional() @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsIn(APP_ROLES, { each: true }) roles?: AppRole[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}
