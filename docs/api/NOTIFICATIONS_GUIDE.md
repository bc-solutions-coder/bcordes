# Notifications Guide

The Notifications module handles all outbound communication: **Email**, **SMS**, **In-App** (real-time), and **Push** (FCM, APNS, WebPush). It is event-driven — other modules publish integration events via RabbitMQ and the Notifications module reacts by sending messages through the appropriate channels.

---

## Channels Overview

| Channel | Provider | Fallback | Real-Time |
|---------|----------|----------|-----------|
| Email | SMTP (MailKit) | None | No |
| SMS | Twilio | NullSmsProvider (logs only) | No |
| In-App | SignalR + Redis backplane | None | Yes |
| Push | FCM, APNS, WebPush | LogPushProvider (logs only) | Yes |

---

## Configuration

### Email (SMTP)

In `appsettings.json`:

```json
{
  "Notifications": {
    "Email": {
      "Provider": "Smtp"
    }
  },
  "Smtp": {
    "Host": "localhost",
    "Port": 1025,
    "UseSsl": false,
    "Username": "",
    "Password": "",
    "DefaultFromAddress": "noreply@wallow.local",
    "DefaultFromName": "Wallow",
    "MaxRetries": 3,
    "TimeoutSeconds": 30
  }
}
```

For local development, Mailpit catches all outgoing email at `http://localhost:8025`.

### SMS (Twilio)

```json
{
  "TwilioSettings": {
    "AccountSid": "your-account-sid",
    "AuthToken": "your-auth-token",
    "FromPhoneNumber": "+1234567890"
  }
}
```

If `TwilioSettings:AccountSid` is empty or missing, the `NullSmsProvider` is registered automatically — it logs messages but does not send them. This is the default for local development.

### Push Notifications

Push notifications are configured **per-tenant** via the admin API. Each tenant stores encrypted credentials for each platform they want to support.

Global defaults can be set in `appsettings.json`:

```json
{
  "PushSettings": {
    "Fcm": {
      "ServerKey": "...",
      "ProjectId": "..."
    },
    "Apns": {
      "TeamId": "...",
      "KeyId": "...",
      "BundleId": "...",
      "UseSandbox": true
    },
    "WebPush": {
      "Subject": "mailto:admin@example.com",
      "VapidPublicKey": "...",
      "VapidPrivateKey": "..."
    }
  }
}
```

---

## API Endpoints

### In-App Notifications — `/api/v1/notifications`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get paginated notifications (`?pageNumber=1&pageSize=20`) |
| GET | `/unread-count` | Get unread notification count |
| POST | `/{id}/read` | Mark a single notification as read |
| POST | `/read-all` | Mark all notifications as read |

### Notification Settings — `/api/v1/notification-settings`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get all notification preferences for current user |
| PUT | `/channel` | Enable/disable an entire channel (e.g., turn off all email) |
| PUT | `/type` | Enable/disable a specific notification type on a channel |

**Example — disable email notifications globally:**

```http
PUT /api/v1/notification-settings/channel
Content-Type: application/json

{
  "channelType": "Email",
  "isEnabled": false
}
```

**Example — disable only billing invoice emails:**

```http
PUT /api/v1/notification-settings/type
Content-Type: application/json

{
  "channelType": "Email",
  "notificationType": "BillingInvoice",
  "isEnabled": false
}
```

### Push Configuration (Admin) — `/api/v1/admin/push/config`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get tenant's push configuration |
| PUT | `/` | Upsert push credentials for a platform |
| PATCH | `/enabled` | Enable/disable push for a platform |
| DELETE | `/{platform}` | Remove push configuration for a platform |

### Push Devices — `/api/v1/push`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/devices` | Register a device for push notifications |
| DELETE | `/devices/{id}` | Deregister a device |
| GET | `/devices` | List current user's registered devices |
| POST | `/send` | Send a push notification to a user |

---

## Notification Types

The `NotificationType` enum defines what kinds of notifications exist:

| Type | Description |
|------|-------------|
| `TaskAssigned` | A task was assigned to the user |
| `TaskCompleted` | A task the user owns was completed |
| `TaskComment` | Someone commented on the user's task |
| `SystemAlert` | System-level alert |
| `BillingInvoice` | Invoice-related notification |
| `Mention` | User was mentioned |
| `Announcement` | Tenant-wide announcement |
| `SystemNotification` | General system notification |

Users can enable/disable each type independently per channel.

---

## Integration Events

The Notifications module **listens** to events from other modules and sends notifications automatically. No direct module references are needed.

### Events Consumed

| Event | Source Module | Action |
|-------|-------------|--------|
| `UserRegisteredEvent` | Identity | Welcome email + SMS (if phone provided) |
| `PasswordResetRequestedEvent` | Identity | Password reset email |
| `UserRoleChangedEvent` | Identity | Role change notification |
| `OrganizationCreatedEvent` | Identity | Organization creation email |
| `OrganizationMemberAddedEvent` | Identity | Member added email |
| `OrganizationMemberRemovedEvent` | Identity | Member removed email |
| `InvoiceOverdueEvent` | Billing | Overdue invoice email |
| `InvoicePaidEvent` | Billing | Invoice paid email |
| `PaymentReceivedEvent` | Billing | Payment received email |
| `InquirySubmittedEvent` | Inquiries | Admin notification email + SignalR |
| `InquiryStatusChangedEvent` | Inquiries | Status change email + SignalR |
| `InquiryCommentAddedEvent` | Inquiries | SignalR real-time notification |
| `MessageSentEvent` | Messaging | Message notification |
| `AnnouncementPublishedEvent` | Announcements | Email + SignalR broadcast |

### Events Published

| Event | When |
|-------|------|
| `EmailSentEvent` | After successful email delivery |
| `SmsSentEvent` | After successful SMS delivery |
| `PushSentEvent` | After successful push delivery |
| `NotificationCreatedEvent` | After in-app notification is created |

---

## How It Works

### Sending a Notification from Another Module

Other modules never reference the Notifications module directly. Instead, they publish integration events via Wolverine/RabbitMQ, and the Notifications module's handlers react.

```
Your Module                          Notifications Module
┌─────────────────┐                 ┌──────────────────────────────┐
│ Publish event   │                 │ Wolverine handler receives   │
│ via IMessageBus │───RabbitMQ────> │ 1. Check user preferences    │
│                 │                 │ 2. Send via provider         │
│                 │                 │ 3. Persist delivery record   │
└─────────────────┘                 │ 4. Publish delivery event    │
                                    └──────────────────────────────┘
```

**Example — sending a notification when something happens in your module:**

1. Define an integration event in `Wallow.Shared.Contracts`:

```csharp
public sealed record MyFeatureCompletedEvent(
    Guid TenantId,
    Guid UserId,
    string UserEmail,
    string FeatureName);
```

2. Publish it from your module:

```csharp
await bus.PublishAsync(new MyFeatureCompletedEvent(
    tenantContext.TenantId,
    userId,
    userEmail,
    "Feature X"));
```

3. Create a handler in the Notifications module (`EventHandlers/`):

```csharp
public static class MyFeatureCompletedNotificationHandler
{
    public static async Task Handle(
        MyFeatureCompletedEvent message,
        IMessageBus bus)
    {
        SendEmailCommand emailCommand = new(
            To: message.UserEmail,
            From: null,
            Subject: $"Feature completed: {message.FeatureName}",
            Body: $"Your feature '{message.FeatureName}' has been completed.",
            UserId: message.UserId,
            NotificationType: "MyFeatureCompleted");

        await bus.InvokeAsync<Result<EmailDto>>(emailCommand);
    }
}
```

Wolverine auto-discovers the handler — no manual registration needed.

### Sending Email Directly (via Command)

```csharp
SendEmailCommand command = new(
    To: "user@example.com",
    From: null,               // uses default from address
    Subject: "Welcome!",
    Body: "Welcome to the platform.",
    UserId: userId,           // optional: enables preference checking
    NotificationType: "UserRegistered");

Result<EmailDto> result = await bus.InvokeAsync<Result<EmailDto>>(command);
```

If the user has disabled email for the given `NotificationType`, the handler skips sending and returns success.

### Sending In-App Notifications

```csharp
SendNotificationCommand command = new(
    UserId: userId,
    Type: NotificationType.TaskAssigned,
    Title: "New Task Assigned",
    Message: "You have been assigned to 'Update documentation'");

Result<NotificationDto> result = await bus.InvokeAsync<Result<NotificationDto>>(command);
```

This persists the notification to the database **and** pushes it in real-time via SignalR.

### Sending SMS

```csharp
SendSmsCommand command = new(
    To: "+1234567890",
    Body: "Your verification code is 123456",
    UserId: userId,
    NotificationType: "UserRegistered");

Result result = await bus.InvokeAsync<Result>(command);
```

### Sending Push Notifications

```csharp
// 1. Tenant admin configures push credentials (one-time)
UpsertTenantPushConfigCommand configCommand = new(
    TenantId: tenantId,
    Platform: PushPlatform.Fcm,
    Credentials: "{\"type\": \"service_account\", ...}");
await bus.InvokeAsync<Result>(configCommand);

// 2. User registers their device
RegisterDeviceCommand registerCommand = new(
    UserId: userId,
    TenantId: tenantId,
    Platform: PushPlatform.Fcm,
    Token: "device-token-from-client");
await bus.InvokeAsync<Result>(registerCommand);

// 3. Send a push notification
SendPushCommand pushCommand = new(
    RecipientId: userId,
    TenantId: tenantId,
    Title: "New Message",
    Body: "You have a new message",
    NotificationType: NotificationType.TaskAssigned);
await bus.InvokeAsync<Result>(pushCommand);
```

Push credentials are encrypted at rest using the Data Protection API.

---

## User Preferences

Users control what they receive through a two-level preference system:

1. **Channel-level** — enable/disable an entire channel (e.g., turn off all SMS)
2. **Type-level** — enable/disable a specific notification type on a channel (e.g., turn off billing emails but keep system alerts)

When a handler sends a notification, it checks preferences before delivery. If the user has disabled that channel or type, the message is silently skipped.

```csharp
// Disable all email
SetChannelEnabledCommand command = new(
    UserId: userId,
    ChannelType: ChannelType.Email,
    IsEnabled: false,
    NotificationType: null);      // null = applies to all types

// Disable only billing invoice emails
SetChannelEnabledCommand command = new(
    UserId: userId,
    ChannelType: ChannelType.Email,
    IsEnabled: false,
    NotificationType: NotificationType.BillingInvoice);
```

---

## Real-Time Delivery (SignalR)

In-app notifications are delivered in real-time via SignalR with a Redis backplane for multi-server support.

The `INotificationService` interface provides two delivery modes:

- **`SendToUserAsync`** — sends to a specific user (e.g., task assignment)
- **`BroadcastToTenantAsync`** — sends to all users in a tenant (e.g., announcement)

Messages are wrapped in a `RealtimeEnvelope` with event types like `"NotificationCreated"` and `"AnnouncementPublished"`.

---

## Retry and Resilience

### Email
- **SMTP resilience pipeline** (Polly): 3 retries with exponential backoff + 30-second timeout
- **Failed email retry job**: Background Hangfire job picks up emails with `Status = Failed` and `RetryCount < 3`, resets them, and re-attempts delivery

### SMS and Push
- Messages track `RetryCount` and support `ResetForRetry()` / `CanRetry()` methods
- Failed messages can be retried up to 3 times

### Connection Pooling
- SMTP connections are pooled via `SmtpConnectionPool` for performance under load

---

## Multi-Tenancy

- Each tenant has its own database schema in PostgreSQL
- Push notification credentials are stored per-tenant (encrypted)
- Query filters automatically scope all reads to the current tenant
- SignalR groups enable tenant-scoped broadcasts

---

## Observability

- Email sending is instrumented with `Activity` tracing (OpenTelemetry-compatible)
- Each channel has a dedicated telemetry class (e.g., `EmailModuleTelemetry`, `NotificationsModuleTelemetry`)
- Failed deliveries are logged with structured error details

---

## Local Development

| Service | URL | Purpose |
|---------|-----|---------|
| Mailpit | http://localhost:8025 | Catches all outgoing email |
| RabbitMQ | http://localhost:15672 | Message broker management UI |
| Grafana | http://localhost:3001 | Observability dashboards |

Start infrastructure:

```bash
cd docker && docker compose up -d
```

SMS uses the `NullSmsProvider` by default (logs messages, doesn't send). Push uses `LogPushProvider` when no tenant configuration exists.

---

## Adding Notifications for a New Module

1. **Define your integration event** in `Wallow.Shared.Contracts`:

```csharp
public sealed record YourEventHappenedEvent(
    Guid TenantId,
    Guid UserId,
    string UserEmail,
    string Details);
```

2. **Publish the event** from your module when the action occurs:

```csharp
await bus.PublishAsync(new YourEventHappenedEvent(...));
```

3. **Create a handler** in `Wallow.Notifications.Application/EventHandlers/`:

```csharp
public static class YourEventNotificationHandler
{
    public static async Task Handle(
        YourEventHappenedEvent message,
        IMessageBus bus)
    {
        // Send email
        await bus.InvokeAsync<Result<EmailDto>>(new SendEmailCommand(
            To: message.UserEmail,
            From: null,
            Subject: "Something happened",
            Body: $"Details: {message.Details}",
            UserId: message.UserId,
            NotificationType: "YourEvent"));

        // Optionally send in-app notification
        await bus.InvokeAsync<Result<NotificationDto>>(new SendNotificationCommand(
            UserId: message.UserId,
            Type: NotificationType.SystemNotification,
            Title: "Something happened",
            Message: message.Details));
    }
}
```

4. **No registration needed** — Wolverine auto-discovers handlers in all `Wallow.*` assemblies.
