import { Module } from '@nestjs/common';

/**
 * Gateway module - combines all WebSocket gateways
 * Individual gateways are defined in their respective modules
 * (sections.gateway.ts, scores.gateway.ts)
 */
@Module({})
export class GatewayModule {}
