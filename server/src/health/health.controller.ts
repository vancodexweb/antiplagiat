import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

// Не под общим префиксом /api и не документируется в Swagger — используется
// исключительно docker-compose healthcheck'ом контейнера api.
@ApiExcludeController()
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
