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
import { JwtTokens } from './jwt-tokens.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly tokens: JwtTokens) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('signin')
  signin(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const accessToken = this.tokens.issue(req.user.id);
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 1000,
    });
    return { accessToken, tokenType: 'Bearer', expiresIn: 3600 };
  }

  @UseGuards(SessionAuthGuard)
  @Get('protected')
  getH(@Request() req: ExpressRequest & { user: { id: string } }) {
    return req.user;
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Response({ passthrough: true }) res: ExpressResponse) {
    res.clearCookie('access_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return { message: 'Logged out' };
  }
}
