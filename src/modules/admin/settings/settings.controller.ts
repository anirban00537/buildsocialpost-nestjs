import { Controller, Get } from '@nestjs/common';
import { SettingService } from './settings.service';
import { ResponseModel } from 'src/shared/models/response.model';

@Controller('admin-settings')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Get('common-settings')
  commonSettings(): Promise<ResponseModel> {
      return this.settingService.commonSettings();
  }
}
