import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
export class CreateUserDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @Transform(trim)
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(72)
  password!: string;
}
