import { IsNotEmpty, IsString } from 'class-validator';

export class LinkChessComAccountDto {
  @IsString()
  @IsNotEmpty()
  username!: string;
}
