import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { UserService } from '../../user/user.service.js';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(private userService: UserService) {
    super();
  }

  serializeUser(user: { id: string }, done: (err: Error | null, id: string) => void): void {
    done(null, user.id);
  }

  async deserializeUser(
    payload: string,
    done: (err: Error | null, user: unknown) => void,
  ): Promise<void> {
    const user = await this.userService.findById(payload);
    done(null, user);
  }
}
