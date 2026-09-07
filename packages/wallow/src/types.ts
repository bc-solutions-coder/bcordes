import type {
  NotificationResponse,
  SetChannelEnabledRequest,
} from '@bc-solutions-coder/sdk'

/** Envelope for real-time SSE messages from the Wallow backend */
export interface RealtimeEnvelope {
  type: string
  module: string
  payload: unknown
  timestamp: string
  correlationId?: string
}

export type {
  InquiryResponse as Inquiry,
  InquiryCommentResponse as InquiryComment,
} from '@bc-solutions-coder/sdk'

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

export type Notification = NotificationResponse & { entityId?: string }
export type NotificationSettings = SetChannelEnabledRequest

/** Registered push notification device */
export interface PushDevice {
  id: string
  platform: string
  createdAt: string
}
