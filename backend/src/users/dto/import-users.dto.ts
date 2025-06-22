import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

export class ImportUsersDto {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUserDto)
  users: CreateUserDto[];
}

export class ImportUsersResponseDto {
  total: number;
  success: number;
  failed: number;
  errors: ImportUserError[];
}

export class ImportUserError {
  row: number;
  email: string;
  username: string;
  error: string;
}