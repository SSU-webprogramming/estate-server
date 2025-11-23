import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../modules/user/entities/user.entity';
import { Document } from '../modules/document/entities/document.entity';
import { Estate } from '../modules/estate/entities/estate.entity';
import { AnalysisResult } from '../modules/analysis-result/entities/analysis-result.entity';

export const getTypeOrmConfig = async (
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT'),
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_DATABASE'),
  entities: [User, Document, Estate, AnalysisResult],
  synchronize: true, // In production, this should be false and migrations should be used
});
