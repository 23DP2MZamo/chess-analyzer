import { IsIn } from 'class-validator';
export class ProfileDashboardQuery {
  @IsIn(['ALL', 'CHESSCOM', 'LICHESS']) platform: 'ALL' | 'CHESSCOM' | 'LICHESS' = 'CHESSCOM';
  @IsIn(['BULLET', 'BLITZ', 'RAPID', 'CLASSICAL', 'CORRESPONDENCE']) format:
    'BULLET' | 'BLITZ' | 'RAPID' | 'CLASSICAL' | 'CORRESPONDENCE' = 'BLITZ';
}
