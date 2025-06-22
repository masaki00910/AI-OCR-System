import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { Template } from '../entities/template.entity';
import { PromptTemplate } from '../entities/prompt-template.entity';

@Controller('api/v1/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async create(
    @Body() createTemplateDto: CreateTemplateDto,
    @CurrentUser() user: User,
  ): Promise<Template> {
    return this.templatesService.create(
      createTemplateDto,
      user.id,
      user.tenantId,
    );
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('isActive') isActive?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ templates: Template[]; total: number }> {
    const options = {
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    return this.templatesService.findAll(user.tenantId, options);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Template> {
    return this.templatesService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
    @CurrentUser() user: User,
  ): Promise<Template> {
    return this.templatesService.update(
      id,
      updateTemplateDto,
      user.id,
      user.tenantId,
    );
  }

  @Post(':id/version')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async createNewVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Template> {
    return this.templatesService.createNewVersion(id, user.id, user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.templatesService.delete(id, user.id, user.tenantId);
  }

  // Prompt Template endpoints

  @Post(':id/prompts')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async createPrompts(
    @Param('id', ParseUUIDPipe) templateId: string,
    @Body() prompts: CreatePromptDto[],
    @CurrentUser() user: User,
  ): Promise<PromptTemplate[]> {
    return this.templatesService.createPrompts(
      templateId,
      prompts,
      user.id,
      user.tenantId,
    );
  }

  @Patch('prompts/:promptId')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async updatePrompt(
    @Param('promptId', ParseUUIDPipe) promptId: string,
    @Body() updatePromptDto: UpdatePromptDto,
    @CurrentUser() user: User,
  ): Promise<PromptTemplate> {
    return this.templatesService.updatePrompt(
      promptId,
      updatePromptDto,
      user.id,
      user.tenantId,
    );
  }

  @Delete('prompts/:promptId')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePrompt(
    @Param('promptId', ParseUUIDPipe) promptId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.templatesService.deletePrompt(promptId, user.id, user.tenantId);
  }

  @Post(':id/prompts/process')
  async processPrompts(
    @Param('id', ParseUUIDPipe) templateId: string,
    @Body() variables: Record<string, any>,
    @CurrentUser() user: User,
  ): Promise<{ prompts: string[] }> {
    const prompts = await this.templatesService.processPromptTemplate(
      templateId,
      user.tenantId,
      variables,
    );
    return { prompts };
  }
}