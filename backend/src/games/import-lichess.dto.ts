import { IsInt, Min, Max } from 'class-validator';

export class ImportLichessDto {
  @IsInt()
  @Min(1)
  @Max(300)
  limit: number = 100;
}
