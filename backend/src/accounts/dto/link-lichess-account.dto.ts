import { IsNotEmpty, IsString } from 'class-validator';

export class LinkLichessAccountDto {
  @IsString()
  @IsNotEmpty()
  username!: string;
}
