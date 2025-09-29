import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import typeOrmConfig from './config/typeorm.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { DocumentAnalyzerModule } from './modules/document-analyzer/document-analyzer.module';

@Module({
  imports: [TypeOrmModule.forRoot(typeOrmConfig), UserModule, DocumentAnalyzerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
