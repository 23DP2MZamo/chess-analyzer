import { Controller, Get, Query } from '@nestjs/common';
import { OpeningsService } from './openings.service';

@Controller('openings')
export class OpeningsController {
  constructor(private readonly openingsService: OpeningsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.openingsService.findAll(search?.trim());
  }
}
