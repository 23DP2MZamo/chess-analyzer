import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

describe('AuthService', () => {
  let service: AuthService;
  const users = { findByUsernameOrEmail: jest.fn() };

  beforeEach(async () => {
    users.findByUsernameOrEmail.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: UserService, useValue: users }],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('rejects blocked accounts before password authentication', async () => {
    users.findByUsernameOrEmail.mockResolvedValue({ isBlocked: true });
    await expect(service.validateUser('player', 'password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
