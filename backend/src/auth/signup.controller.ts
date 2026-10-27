import { Body, Controller, Post, Response, UsePipes, ValidationPipe } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { JwtTokens } from './jwt-tokens.service';
import { setAccessCookie } from './access-cookie';

@Controller('auth')
export class SignupController {
  constructor(
    private readonly users: UserService,
    private readonly tokens: JwtTokens,
  ) {}
  @Post('signup')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async signup(
    @Body() body: CreateUserDto,
    @Response({ passthrough: true }) response: ExpressResponse,
  ) {
    const user = await this.users.create(body);
    const accessToken = this.tokens.issue(user.id);
    setAccessCookie(response, accessToken);
    return { user, accessToken, tokenType: 'Bearer', expiresIn: 3600 };
  }
}
