import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validationExceptionFactory } from './common/exceptions/validation-exception.factory';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.setGlobalPrefix('api', { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Antiplagiat API')
    .setDescription(
      'Сервис проверки текстовых документов на оригинальность, заимствования, признаки ИИ-генерации, ' +
        'грамматику, читаемость и попытки обмана системы антиплагиата.',
    )
    .setVersion('1.0')
    .addTag('Документы', 'Загрузка документов и получение результатов проверки')
    .addTag('Корпус', 'Эталонный корпус документов для сверки на заимствования')
    .addTag('Конфигурация', 'Настраиваемые параметры системы: веса детектора ИИ, словари, нормативы')
    .addTag('Аналитика', 'Сводная аналитика по проверенным документам')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = process.env.API_PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] запущен на порту ${port}, документация: /api/docs`);
}

bootstrap();
