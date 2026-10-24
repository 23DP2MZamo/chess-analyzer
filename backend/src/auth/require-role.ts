import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/client';
import { SessionAuthGuard } from './auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<{ user?: { role: Role } }>();
    if (roles?.length && (!request.user || !roles.includes(request.user.role))) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}

export function requireRole(...roles: Role[]) {
  return applyDecorators(SetMetadata('roles', roles), UseGuards(SessionAuthGuard, RolesGuard));
}
