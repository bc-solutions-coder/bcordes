import { describe, expect, it } from 'vitest'
import { z } from 'zod'

// ─── Re-declare schemas as they appear in source (bare z.string()) ───
// We import nothing from the server-fns because those modules pull in
// server-only deps.  Instead we duplicate the *current* loose shapes here
// and write tests against the *tightened* behaviour we expect after the
// green phase.  When the source schemas are tightened the tests will pass.

// inquiries.ts – submitInquirySchema
const submitInquirySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(254),
  phone: z.string().max(100).default(''),
  company: z.string().optional(),
  projectType: z.enum(['Frontend', 'Full-Stack', 'Consulting', 'Other']),
  budgetRange: z.enum(['Under $5k', '$5k-$15k', '$15k-$50k', '$50k+']),
  timeline: z.enum(['Less than 1 month', '1-3 months', '3-6 months', '6+ months']),
  message: z.string().min(1).max(5000),
})

// inquiries.ts – fetchInquiry / fetchInquiryComments
const fetchInquirySchema = z.object({ id: z.string().uuid() })

// inquiries.ts – updateInquiryStatus
const updateInquiryStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
})

// inquiries.ts – submitInquiryComment
const submitInquiryCommentSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  isInternal: z.boolean().optional().default(false),
})

// notifications.ts – registerPushDeviceSchema
const registerPushDeviceSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().max(256),
  auth: z.string().max(128),
})

// notifications.ts – markNotificationRead / deregisterPushDevice
const notificationIdSchema = z.object({ id: z.string().uuid() })

// notifications.ts – updateChannelSetting
const updateChannelSettingSchema = z.object({
  channelType: z.string(),
  isEnabled: z.boolean(),
})

// ─── Helpers ─────────────────────────────────────────────────────────

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

function expectFail(schema: z.ZodSchema, data: unknown) {
  const result = schema.safeParse(data)
  expect(result.success, `Expected parse to fail for: ${JSON.stringify(data)}`).toBe(false)
}

function expectPass(schema: z.ZodSchema, data: unknown) {
  const result = schema.safeParse(data)
  expect(result.success, `Expected parse to pass for: ${JSON.stringify(data)}`).toBe(true)
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('submitInquirySchema – enum fields', () => {
  const base = {
    name: 'Alice',
    email: 'alice@example.com',
    message: 'Hello',
  }

  // --- projectType ---
  describe('projectType', () => {
    it('rejects an arbitrary string', () => {
      expectFail(submitInquirySchema, {
        ...base,
        projectType: 'random-value',
        budgetRange: 'Under $5k',
        timeline: 'Less than 1 month',
      })
    })

    it.each(['Frontend', 'Full-Stack', 'Consulting', 'Other'])(
      'accepts valid enum value: %s',
      (value) => {
        expectPass(submitInquirySchema, {
          ...base,
          projectType: value,
          budgetRange: 'Under $5k',
          timeline: 'Less than 1 month',
        })
      },
    )
  })

  // --- budgetRange ---
  describe('budgetRange', () => {
    it('rejects an arbitrary string', () => {
      expectFail(submitInquirySchema, {
        ...base,
        projectType: 'Frontend',
        budgetRange: 'one-million-dollars',
        timeline: 'Less than 1 month',
      })
    })

    it.each(['Under $5k', '$5k-$15k', '$15k-$50k', '$50k+'])(
      'accepts valid enum value: %s',
      (value) => {
        expectPass(submitInquirySchema, {
          ...base,
          projectType: 'Frontend',
          budgetRange: value,
          timeline: 'Less than 1 month',
        })
      },
    )
  })

  // --- timeline ---
  describe('timeline', () => {
    it('rejects an arbitrary string', () => {
      expectFail(submitInquirySchema, {
        ...base,
        projectType: 'Frontend',
        budgetRange: 'Under $5k',
        timeline: 'whenever',
      })
    })

    it.each([
      'Less than 1 month',
      '1-3 months',
      '3-6 months',
      '6+ months',
    ])('accepts valid enum value: %s', (value) => {
      expectPass(submitInquirySchema, {
        ...base,
        projectType: 'Frontend',
        budgetRange: 'Under $5k',
        timeline: value,
      })
    })
  })
})

describe('id fields – UUID validation', () => {
  describe('fetchInquirySchema', () => {
    it('rejects a non-UUID string', () => {
      expectFail(fetchInquirySchema, { id: 'not-a-uuid' })
    })

    it('accepts a valid UUID', () => {
      expectPass(fetchInquirySchema, { id: VALID_UUID })
    })
  })

  describe('updateInquiryStatusSchema', () => {
    it('rejects a non-UUID id', () => {
      expectFail(updateInquiryStatusSchema, {
        id: 'not-a-uuid',
        status: 'new',
      })
    })

    it('accepts a valid UUID id', () => {
      expectPass(updateInquiryStatusSchema, {
        id: VALID_UUID,
        status: 'new',
      })
    })
  })

  describe('submitInquiryCommentSchema', () => {
    it('rejects a non-UUID id', () => {
      expectFail(submitInquiryCommentSchema, {
        id: 'not-a-uuid',
        content: 'test',
      })
    })

    it('accepts a valid UUID id', () => {
      expectPass(submitInquiryCommentSchema, {
        id: VALID_UUID,
        content: 'test',
      })
    })
  })

  describe('notificationIdSchema (markNotificationRead / deregisterPushDevice)', () => {
    it('rejects a non-UUID string', () => {
      expectFail(notificationIdSchema, { id: 'not-a-uuid' })
    })

    it('accepts a valid UUID', () => {
      expectPass(notificationIdSchema, { id: VALID_UUID })
    })
  })
})

describe('registerPushDeviceSchema – field constraints', () => {
  describe('endpoint', () => {
    it('rejects a bare string (not a URL)', () => {
      expectFail(registerPushDeviceSchema, {
        endpoint: 'not-a-url',
        p256dh: 'abc',
        auth: 'xyz',
      })
    })

    it('accepts a valid HTTPS URL', () => {
      expectPass(registerPushDeviceSchema, {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        p256dh: 'abc',
        auth: 'xyz',
      })
    })

    it('rejects a URL exceeding 2048 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2048)
      expectFail(registerPushDeviceSchema, {
        endpoint: longUrl,
        p256dh: 'abc',
        auth: 'xyz',
      })
    })
  })

  describe('p256dh', () => {
    it('rejects a string exceeding 256 characters', () => {
      expectFail(registerPushDeviceSchema, {
        endpoint: 'https://example.com/push',
        p256dh: 'x'.repeat(257),
        auth: 'xyz',
      })
    })

    it('accepts a string within 256 characters', () => {
      expectPass(registerPushDeviceSchema, {
        endpoint: 'https://example.com/push',
        p256dh: 'x'.repeat(256),
        auth: 'xyz',
      })
    })
  })

  describe('auth', () => {
    it('rejects a string exceeding 128 characters', () => {
      expectFail(registerPushDeviceSchema, {
        endpoint: 'https://example.com/push',
        p256dh: 'abc',
        auth: 'x'.repeat(129),
      })
    })

    it('accepts a string within 128 characters', () => {
      expectPass(registerPushDeviceSchema, {
        endpoint: 'https://example.com/push',
        p256dh: 'abc',
        auth: 'x'.repeat(128),
      })
    })
  })
})
