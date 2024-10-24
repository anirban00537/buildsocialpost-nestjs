import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';
import { IsAdmin } from 'src/shared/decorators/is-admin.decorator';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
  @IsAdmin()
  @Get('dashboard')
  async getDashboardData() {
    return this.adminService.getDashboardData();
  }
}
