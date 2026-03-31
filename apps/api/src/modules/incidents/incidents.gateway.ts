import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WS_EVENTS, WS_ROOMS, IncidentEventPayload } from '@vully/shared-types';

// For JWT validation in WebSocket connections
interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface JoinRoomPayload {
  room: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class IncidentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(IncidentsGateway.name);

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log({
      event: 'ws_client_connected',
      clientId: client.id,
      userId: client.user?.id,
    });
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log({
      event: 'ws_client_disconnected',
      clientId: client.id,
      userId: client.user?.id,
    });
  }

  @SubscribeMessage(WS_EVENTS.JOIN_ROOM)
  handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const { room } = payload;

    // Basic validation: only allow known room patterns
    const validPatterns = [
      /^building:[a-f0-9-]{36}$/,
      /^apartment:[a-f0-9-]{36}$/,
      /^user:[a-f0-9-]{36}$/,
      /^role:(admin|technician)$/,
    ];

    const isValidRoom = validPatterns.some((pattern) => pattern.test(room));

    if (!isValidRoom) {
      this.logger.warn({
        event: 'ws_invalid_room',
        clientId: client.id,
        room,
      });
      return { success: false, error: 'Invalid room' };
    }

    // TODO: Add proper authorization checks:
    // - user:xxx should only be joinable by that user
    // - role:admin should only be joinable by admins
    // - apartment:xxx should be joinable by residents/assigned technicians
    // - building:xxx should be joinable by admins/technicians for that building

    client.join(room);

    this.logger.log({
      event: 'ws_room_joined',
      clientId: client.id,
      userId: client.user?.id,
      room,
    });

    return { success: true };
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_ROOM)
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const { room } = payload;
    client.leave(room);

    this.logger.log({
      event: 'ws_room_left',
      clientId: client.id,
      room,
    });

    return { success: true };
  }

  // =============================================================================
  // Incident Event Emitters (called by IncidentsService)
  // =============================================================================

  emitIncidentCreated(payload: IncidentEventPayload) {
    // Emit to building room and admin room
    this.server.to(WS_ROOMS.building(payload.buildingId)).emit(WS_EVENTS.INCIDENT_CREATED, payload);
    this.server.to(WS_ROOMS.admin()).emit(WS_EVENTS.INCIDENT_CREATED, payload);

    this.logger.log({
      event: 'ws_incident_created_emitted',
      incidentId: payload.incidentId,
      buildingId: payload.buildingId,
    });
  }

  emitIncidentUpdated(payload: IncidentEventPayload) {
    // Emit to building room, apartment room, and admin room
    this.server.to(WS_ROOMS.building(payload.buildingId)).emit(WS_EVENTS.INCIDENT_UPDATED, payload);
    this.server.to(WS_ROOMS.apartment(payload.apartmentId)).emit(WS_EVENTS.INCIDENT_UPDATED, payload);
    this.server.to(WS_ROOMS.admin()).emit(WS_EVENTS.INCIDENT_UPDATED, payload);

    // If assigned to a technician, emit to their personal room
    if (payload.assignedTo) {
      this.server.to(WS_ROOMS.user(payload.assignedTo)).emit(WS_EVENTS.INCIDENT_UPDATED, payload);
    }

    this.logger.log({
      event: 'ws_incident_updated_emitted',
      incidentId: payload.incidentId,
    });
  }

  emitIncidentAssigned(payload: IncidentEventPayload) {
    // Emit to the assigned technician
    if (payload.assignedTo) {
      this.server.to(WS_ROOMS.user(payload.assignedTo)).emit(WS_EVENTS.INCIDENT_ASSIGNED, payload);
      this.server.to(WS_ROOMS.technician()).emit(WS_EVENTS.INCIDENT_ASSIGNED, payload);
    }

    // Also notify admin room
    this.server.to(WS_ROOMS.admin()).emit(WS_EVENTS.INCIDENT_ASSIGNED, payload);

    this.logger.log({
      event: 'ws_incident_assigned_emitted',
      incidentId: payload.incidentId,
      assignedTo: payload.assignedTo,
    });
  }

  emitIncidentResolved(payload: IncidentEventPayload) {
    // Emit to relevant rooms
    this.server.to(WS_ROOMS.building(payload.buildingId)).emit(WS_EVENTS.INCIDENT_RESOLVED, payload);
    this.server.to(WS_ROOMS.apartment(payload.apartmentId)).emit(WS_EVENTS.INCIDENT_RESOLVED, payload);
    this.server.to(WS_ROOMS.admin()).emit(WS_EVENTS.INCIDENT_RESOLVED, payload);

    if (payload.assignedTo) {
      this.server.to(WS_ROOMS.user(payload.assignedTo)).emit(WS_EVENTS.INCIDENT_RESOLVED, payload);
    }

    this.logger.log({
      event: 'ws_incident_resolved_emitted',
      incidentId: payload.incidentId,
    });
  }

  // Generic emit helper for custom events
  emitToRoom(room: string, event: string, payload: unknown) {
    this.server.to(room).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(WS_ROOMS.user(userId)).emit(event, payload);
  }
}
