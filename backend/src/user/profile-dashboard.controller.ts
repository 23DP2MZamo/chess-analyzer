import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SessionAuthGuard } from '../auth/auth.guard';
import { ProfileDashboardService } from './profile-dashboard.service';
import { ProfileDashboardQuery } from './profile-dashboard.dto';
@Controller('user/me/dashboard')
@UseGuards(SessionAuthGuard)
export class ProfileDashboardController {
  constructor(private readonly dashboard: ProfileDashboardService) {}
  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  get(@Request() request: { user: { id: string } }, @Query() query: ProfileDashboardQuery) {
    return this.dashboard.get(request.user.id, query);
  }
}
