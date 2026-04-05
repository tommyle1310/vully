import {
  IncidentCategory,
  IncidentPriority,
  IncidentStatus,
} from '@vully/shared-types';

// Types
export interface Incident {
  id: string;
  apartmentId: string;
  apartment?: {
    id: string;
    unit_number: string;
    building?: {
      id: string;
      name: string;
    };
  };
  reportedById: string;
  reportedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedToId?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  category: IncidentCategory;
  priority: IncidentPriority;
  status: IncidentStatus;
  title: string;
  description: string;
  imageUrls: string[];
  resolved_at?: string;
  resolutionNotes?: string;
  created_at: string;
  updatedAt: string;
  commentsCount?: number;
}

export interface IncidentComment {
  id: string;
  incidentId: string;
  authorId: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  content: string;
  isInternal: boolean;
  created_at: string;
}

export interface IncidentFilters {
  status?: IncidentStatus;
  category?: IncidentCategory;
  priority?: IncidentPriority;
  apartmentId?: string;
  buildingId?: string;
  assignedToId?: string;
  reportedById?: string;
  search?: string;
}

export interface CreateIncidentData {
  title: string;
  description: string;
  category: IncidentCategory;
  priority?: IncidentPriority;
  apartmentId: string;
  imageUrls?: string[];
}

export interface UpdateIncidentData {
  title?: string;
  description?: string;
  category?: IncidentCategory;
  priority?: IncidentPriority;
  imageUrls?: string[];
}

export interface UpdateIncidentStatusData {
  status: IncidentStatus;
  resolutionNotes?: string;
}

export interface AssignTechnicianData {
  technicianId: string;
}

export interface CreateCommentData {
  content: string;
  isInternal?: boolean;
}

// Query Keys
export const incidentKeys = {
  all: ['incidents'] as const,
  lists: () => [...incidentKeys.all, 'list'] as const,
  list: (filters: IncidentFilters, page: number, limit: number) =>
    [...incidentKeys.lists(), { filters, page, limit }] as const,
  my: (filters: IncidentFilters, page: number, limit: number) =>
    [...incidentKeys.all, 'my', { filters, page, limit }] as const,
  details: () => [...incidentKeys.all, 'detail'] as const,
  detail: (id: string) => [...incidentKeys.details(), id] as const,
  comments: (incidentId: string) =>
    [...incidentKeys.all, 'comments', incidentId] as const,
};

// Response Types
export interface IncidentsResponse {
  data: Incident[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface IncidentResponse {
  data: Incident;
}

export interface CommentsResponse {
  data: IncidentComment[];
}

export interface CommentResponse {
  data: IncidentComment;
}
