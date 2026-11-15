import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) displayName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() currentPassword?: string;
}
export class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(12) @MaxLength(128) newPassword!: string;
}
