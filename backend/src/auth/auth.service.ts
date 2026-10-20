import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { compare } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private userSevice: UserService) {}
  async validateUser(identifier: string, password: string) {
    const user = await this.userSevice.findByUsernameOrEmail(identifier);
    if (!user) throw new UnauthorizedException('User not found!');
    const isPasswordMatch = await compare(password, user.passwordHash);
    if (!isPasswordMatch) throw new UnauthorizedException('Invalid credentials');

    return { id: user.id };
  }
}
