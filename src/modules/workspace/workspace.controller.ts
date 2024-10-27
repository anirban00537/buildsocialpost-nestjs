import { Controller, Delete, Get, Param, Post, Body } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { UserInfo } from 'src/shared/decorators/user.decorators';
import { User } from '@prisma/client';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get('get-my-workspaces')
  getMyWorkspaces(@UserInfo() user: User) {
    return this.workspaceService.getMyWorkspaces(user);
  }

  @Post('create-workspace')
  createWorkspace(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @UserInfo() user: User,
  ) {
    return this.workspaceService.createWorkspace(createWorkspaceDto, user);
  }

  @Post('update-workspace')
  updateWorkspace(
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @UserInfo() user: User,
  ) {
    return this.workspaceService.updateWorkspace(updateWorkspaceDto, user);
  }

  @Delete('delete-workspace/:id')
  deleteWorkspace(@Param('id') id: string, @UserInfo() user: User) {
    return this.workspaceService.deleteWorkspace(id, user);
  }
}
