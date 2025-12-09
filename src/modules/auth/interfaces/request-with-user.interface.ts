import { Request } from 'express';
import { User } from '@/modules/user/entities/user.entity';
import { ProviderType } from '@/common/enums/provider-type.enum';

export interface KakaoRegisterInfo {
  providerType: ProviderType;
  providerId: string;
  username: string;
  email: string;
}

export interface RequestWithUser extends Request {
  user: User | KakaoRegisterInfo;
}
