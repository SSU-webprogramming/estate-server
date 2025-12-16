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
    // Step 1: @Roles 데코레이터에서 필요한 역할 목록 추출
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // Step 2: 역할 제한이 없으면 통과
    if (!requiredRoles) {
      return true;
    }
    
    // Step 3: Request에서 사용자 정보 추출 (JwtAuthGuard가 할당)
    const { user } = context.switchToHttp().getRequest();
    
    // Step 4: 사용자 정보 없으면 거부
    if (!user) {
        return false;
    }

    // Step 5: 사용자 역할이 필요 역할 목록에 포함되는지 확인
    const hasRole = requiredRoles.some((role) => user.role?.toUpperCase() === role);
    
    // Step 6: 권한 없으면 예외 발생
    if (!hasRole) {
      throw new CustomException(ErrorCode.ACCESS_DENIED);
    }
    
    // Step 7: 권한 검증 통과
    return true;
  }
}
