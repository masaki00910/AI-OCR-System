import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangeUserPasswordDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}