import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { Section, User } from '@prisma/client';
import { WsAuthGuard } from '../common/guards/ws-auth.guard';
import { AuthService } from '../auth/auth.service';
import { SectionsService } from './sections.service';

@WebSocketGateway({
  namespace: '/sections',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class SectionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly sectionsService: SectionsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.authService.verifyToken(token);
      const user = await this.authService.getUserFromPayload(payload);

      // Attach user to socket
      client.data.user = user;

      // Join personal room
      client.join(`user:${user.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup handled automatically by Socket.IO
  }

  /**
   * Student joins section room
   */
  @SubscribeMessage('section:join')
  async handleJoinSection(
    @ConnectedSocket() client: Socket,
    @MessageBody() sectionId: number,
  ) {
    const user = client.data.user as User;
    if (!user) return;

    // Verify membership
    const hasAccess = await this.sectionsService.hasAccess(sectionId, user);
    if (!hasAccess) {
      client.emit('error', { message: 'Access denied to this section' });
      return;
    }

    // Join section room
    client.join(`section:${sectionId}`);

    // If user has a group, join group room too
    const section = await this.sectionsService.findById(sectionId);
    if (section.status === 'GRADING_GROUPS') {
      const members = await this.sectionsService.getMembers(sectionId);
      const membership = members.find((m) => m.user.id === user.id);
      if (membership?.group) {
        client.join(`group:${membership.group.id}`);
      }
    }

    return { success: true };
  }

  /**
   * Student leaves section room
   */
  @SubscribeMessage('section:leave')
  handleLeaveSection(
    @ConnectedSocket() client: Socket,
    @MessageBody() sectionId: number,
  ) {
    client.leave(`section:${sectionId}`);
    return { success: true };
  }

  /**
   * Teacher joins management room
   */
  @SubscribeMessage('sectionManagement:join')
  async handleJoinManagement(
    @ConnectedSocket() client: Socket,
    @MessageBody() sectionId: number,
  ) {
    const user = client.data.user as User;
    if (!user) return;

    const section = await this.sectionsService.findById(sectionId);
    if (section.teacherId !== user.id && user.role !== 'ADMIN') {
      client.emit('error', { message: 'Access denied' });
      return;
    }

    client.join(`sectionManagement:${sectionId}`);
    return { success: true };
  }

  /**
   * Teacher joins course room for real-time updates
   */
  @SubscribeMessage('course:join')
  handleJoinCourse(
    @ConnectedSocket() client: Socket,
    @MessageBody() courseId: number,
  ) {
    client.join(`course:${courseId}`);
    return { success: true };
  }

  // ============================================================================
  // EMIT METHODS (called from controllers/services)
  // ============================================================================

  /**
   * Emit section updated to all students
   */
  emitSectionUpdated(sectionId: number, section: Partial<Section>) {
    this.server.to(`section:${sectionId}`).emit('section:updated', section);
  }

  /**
   * Emit when student joins section
   */
  emitStudentJoined(sectionId: number, user: Partial<User>) {
    this.server.to(`sectionManagement:${sectionId}`).emit('section:studentJoined', {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    });
  }

  /**
   * Emit when submission is received
   */
  emitSubmissionReceived(sectionId: number, submission: { id: number; studentId: number }) {
    this.server.to(`sectionManagement:${sectionId}`).emit('section:submissionReceived', submission);
  }

  /**
   * Emit link toggle to join page
   */
  emitLinkToggled(joinableCode: string, isActive: boolean) {
    this.server.to(`joinLink:${joinableCode}`).emit('joinLink:toggled', isActive);
  }

  /**
   * Emit new section to course room
   */
  emitNewSection(courseId: number, section: Partial<Section>) {
    this.server.to(`course:${courseId}`).emit('course:newSection', section);
  }

  /**
   * Emit report generated
   */
  emitReportGenerated(sectionId: number, report: any) {
    this.server.to(`section:${sectionId}`).emit('report:generated', report);
  }
}
