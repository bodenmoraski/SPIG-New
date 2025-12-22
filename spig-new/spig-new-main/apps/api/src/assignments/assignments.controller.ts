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
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth, ApiConsumes } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { AssignmentsService, CreateAssignmentDto } from './assignments.service';
import { CoursesService } from '../courses/courses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { createReadStream } from 'fs';

@ApiTags('assignments')
@Controller('courses/:courseId/assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN)
@ApiBearerAuth()
@ApiCookieAuth()
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly coursesService: CoursesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List course assignments' })
  async findAll(
    @Param('courseId', ParseIntPipe) courseId: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.assignmentsService.findByCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assignment details' })
  async findOne(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.assignmentsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create assignment' })
  async create(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.assignmentsService.create(courseId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update assignment' })
  async update(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateAssignmentDto>,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.assignmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete assignment' })
  async delete(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.assignmentsService.delete(id);
  }

  @Put(':id/rubric')
  @ApiOperation({ summary: 'Assign rubric to assignment' })
  async assignRubric(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { rubricId: number | null },
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    return this.assignmentsService.assignRubric(id, dto.rubricId);
  }

  @Post(':id/pdf')
  @ApiOperation({ summary: 'Upload PDF instructions' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Only PDF files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadPdf(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.assignmentsService.savePdf(id, file.buffer);

    return { success: true, message: 'PDF uploaded successfully' };
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download PDF instructions' })
  async downloadPdf(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);

    if (!this.assignmentsService.pdfExists(id)) {
      throw new NotFoundException('PDF not found');
    }

    const pdfPath = this.assignmentsService.getPdfPath(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="instructions_${id}.pdf"`);
    createReadStream(pdfPath).pipe(res);
  }

  @Delete(':id/pdf')
  @ApiOperation({ summary: 'Delete PDF instructions' })
  async deletePdf(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.coursesService.verifyAccess(courseId, user);
    this.assignmentsService.deletePdf(id);
    return { success: true, message: 'PDF deleted successfully' };
  }
}
