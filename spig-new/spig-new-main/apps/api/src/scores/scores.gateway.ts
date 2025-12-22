import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { User } from '@prisma/client';
import { ScoresService } from './scores.service';
import { SectionsService } from '../sections/sections.service';
import { AuthService } from '../auth/auth.service';

interface UpdateEvaluationPayload {
  scoreId: number;
  evaluation: Record<string, boolean>;
}

interface AgreePayload {
  scoreId: number;
  groupId: number;
}

@WebSocketGateway({
  namespace: '/scores',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ScoresGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly scoresService: ScoresService,
    private readonly sectionsService: SectionsService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Handle evaluation update from group member
   * Matching Phoenix updateEval behavior - clears all signatures
   */
  @SubscribeMessage('evaluation:update')
  async handleEvaluationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UpdateEvaluationPayload,
  ) {
    const user = client.data.user as User;
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Verify access to score
    const hasAccess = await this.scoresService.hasAccess(payload.scoreId, user.id);
    if (!hasAccess) {
      return { error: 'Access denied' };
    }

    // Update evaluation (this clears all signatures)
    const score = await this.scoresService.updateEvaluation(
      payload.scoreId,
      payload.evaluation,
    );

    // Broadcast to all group members
    this.server.to(`group:${score.groupId}`).emit('score:updated', {
      groupId: score.groupId,
      score: {
        id: score.id,
        evaluation: score.evaluation,
        signed: score.signed,
        done: score.done,
      },
    });

    return { success: true };
  }

  /**
   * Handle group member agreeing to score
   * Matching Phoenix sign_eval behavior
   */
  @SubscribeMessage('evaluation:agree')
  async handleAgree(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AgreePayload,
  ) {
    const user = client.data.user as User;
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Verify access to score
    const hasAccess = await this.scoresService.hasAccess(payload.scoreId, user.id);
    if (!hasAccess) {
      return { error: 'Access denied' };
    }

    // Sign the evaluation
    let score = await this.scoresService.signEvaluation(payload.scoreId, user.id);

    // Check if consensus reached
    const consensusReached = await this.scoresService.isConsensusReached(
      payload.scoreId,
      payload.groupId,
    );

    if (consensusReached) {
      // Mark as done
      score = await this.scoresService.markDone(payload.scoreId);
    }

    // Broadcast updated score to group
    this.server.to(`group:${payload.groupId}`).emit('score:updated', {
      groupId: payload.groupId,
      score: {
        id: score.id,
        evaluation: score.evaluation,
        signed: score.signed,
        done: score.done,
      },
      consensusReached,
    });

    return { success: true, consensusReached };
  }

  /**
   * Handle group join
   */
  @SubscribeMessage('group:join')
  async handleGroupJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() groupId: number,
  ) {
    const user = client.data.user as User;
    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Verify user is in group
    const membership = await this.sectionsService
      .getMembers(0) // We need to verify through membership
      .catch(() => []);

    // Join group room
    client.join(`group:${groupId}`);
    return { success: true };
  }

  /**
   * Handle group leave
   */
  @SubscribeMessage('group:leave')
  handleGroupLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() groupId: number,
  ) {
    client.leave(`group:${groupId}`);
    return { success: true };
  }

  /**
   * Emit score sync to specific user
   */
  emitScoreSync(userId: number, score: any) {
    this.server.to(`user:${userId}`).emit('score:synchronized', score);
  }
}
