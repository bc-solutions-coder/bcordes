/** RFC 7807 Problem Details error response from the Wallow backend */
export interface ProblemDetails {
  type: string
  title: string
  status: number
  detail: string
  traceId: string
  code: string
  errors?: Record<string, Array<string>>
}

/** Envelope for real-time SignalR messages from the Wallow backend */
export interface RealtimeEnvelope {
  type: string
  module: string
  payload: unknown
  timestamp: string
  correlationId?: string
}

/** Contact inquiry submitted through the Wallow backend */
export interface Inquiry {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  projectType?: string
  budgetRange?: string
  timeline?: string
  message: string
  status: string
  submitterIpAddress?: string
  submitterId: string | null
  createdAt: string
  updatedAt: string
}

/** Comment attached to an inquiry in the Wallow backend */
export interface InquiryComment {
  id: string
  inquiryId: string
  authorId: string
  authorName: string
  content: string
  isInternal: boolean
  createdAt: string
}

/** Real-time payload emitted when a new inquiry is submitted */
export interface InquirySubmittedPayload {
  inquiryId: string
  name: string
  email: string
}

/** Real-time payload emitted when an inquiry's status changes */
export interface InquiryStatusUpdatedPayload {
  inquiryId: string
  newStatus: string
}

/** Real-time payload emitted when a comment is added to an inquiry */
export interface InquiryCommentAddedPayload {
  inquiryId: string
  commentId: string
  isInternal: boolean
}

/** Generic paginated response from the Wallow backend */
export interface PaginatedResponse<T> {
  items: T[]
  pageNumber: number
  pageSize: number
  totalCount: number
}

/** Notification delivered to a user via the Wallow backend */
export interface Notification {
  id: string
  type: string
  title: string
  body: string
  entityId?: string
  metadata?: Record<string, string>
  readAt: string | null
  createdAt: string
}

/** Per-channel notification preference */
export interface NotificationSettings {
  channelType: string
  isEnabled: boolean
}

/** Registered push notification device */
export interface PushDevice {
  id: string
  platform: string
  createdAt: string
}
