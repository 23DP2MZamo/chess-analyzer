import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class AnalyzePositionDto {
  @IsString()
  @MaxLength(150)
  fen: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(18)
  depth = 12;
}
