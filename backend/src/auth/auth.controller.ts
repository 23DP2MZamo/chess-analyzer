import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Response,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { LocalAuthGuard } from './local-auth/local.guard';
import { SessionAuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('signin')
  signin() {
    return { msg: 'logged in' };
  }

  @UseGuards(SessionAuthGuard)
  @Get('protected')
  getH(@Request() req: ExpressRequest & { user: { id: string } }): { id: string } {
    return req.user;
  }

  @Post('logout')
  logout(@Request() req: ExpressRequest, @Response() res: ExpressResponse): void {
    req.session.destroy(() => {
      res.clearCookie('connect.sid', {
        path: '/',
      });
      res.json({ message: 'Logged out' });
    });
  }
}
