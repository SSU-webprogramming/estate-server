import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user-role.enum';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    
    console.log('RolesGuard User:', user);
    
    if (!user) {
        return false;
    }

    console.log('User Role:', user.role);
    console.log('Required Roles:', requiredRoles);

    const hasRole = requiredRoles.some((role) => user.role?.toUpperCase() === role);
    if (!hasRole) {
      throw new CustomException(ErrorCode.ACCESS_DENIED);
    }
    return true;
  }
}
