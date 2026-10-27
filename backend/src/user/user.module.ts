import { ProfileDashboardController } from './profile-dashboard.controller';
import { ProfileDashboardService } from './profile-dashboard.service';
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserController, ProfileDashboardController],
  providers: [UserService, ProfileDashboardService],
})
export class UserModule {}
