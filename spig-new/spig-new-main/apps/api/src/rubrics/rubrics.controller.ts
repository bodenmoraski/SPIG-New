import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { RubricsService, CreateRubricDto, CreateCriteriaDto } from './rubrics.service';
import { CoursesService } from '../courses/courses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('rubrics')
@Controller('courses/:courseId/rubrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN)
@ApiBearerAuth()
@ApiCookieAuth()
export class RubricsController {
  constructor(
    private readonly rubricsService: RubricsService,
    private readonly coursesService: CoursesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List course rubrics' })
  async findAll(
    @Param('courseId', ParseIntPipe) courseId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.rubricsService.findByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rubric with criteria' })
  async findOne(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.rubricsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create rubric' })
  async create(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CreateRubricDto,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.rubricsService.create(courseId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update rubric' })
  async update(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateRubricDto>,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.rubricsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete rubric' })
  async delete(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.rubricsService.delete(id);
  }

  @Post(':id/criteria')
  @ApiOperation({ summary: 'Add criteria to rubric' })
  async addCriteria(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) rubricId: number,
    @Body() dto: CreateCriteriaDto,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.rubricsService.addCriteria(rubricId, dto);
  }

  @Put(':id/criteria/:critId')
  @ApiOperation({ summary: 'Update criteria' })
  async updateCriteria(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('critId', ParseIntPipe) critId: number,
    @Body() dto: Partial<CreateCriteriaDto>,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.rubricsService.updateCriteria(critId, dto);
  }

  @Delete(':id/criteria/:critId')
  @ApiOperation({ summary: 'Delete criteria' })
  async deleteCriteria(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('critId', ParseIntPipe) critId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.rubricsService.deleteCriteria(critId);
  }
}
