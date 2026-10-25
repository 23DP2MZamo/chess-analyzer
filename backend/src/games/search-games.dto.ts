import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class SearchGamesDto {
  @IsOptional()
  @IsIn(['BULLET', 'BLITZ', 'RAPID', 'CLASSICAL', 'CORRESPONDENCE'])
  format?: string;
  @IsOptional()
  @IsIn(['RATED', 'CASUAL'])
  mode?: string;
  @IsOptional()
  @IsIn(['WIN', 'LOSS', 'DRAW'])
  result?: string;
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;
  @IsOptional()
  @IsString()
  @MaxLength(100)
  opening?: string;
  @IsIn(['date', 'elo', 'accuracy'])
  sortBy: 'date' | 'elo' | 'accuracy' = 'date';
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
  @IsIn(['none', 'opening'])
  groupBy: 'none' | 'opening' = 'none';
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}
