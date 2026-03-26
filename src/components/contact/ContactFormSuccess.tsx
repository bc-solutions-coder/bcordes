import { Button } from '@/components/ui/button'

interface ContactFormSuccessProps {
  onSendAnother: () => void
}

export function ContactFormSuccess({ onSendAnother }: ContactFormSuccessProps) {
  return (
    <div className="rounded-lg border border-border bg-secondary p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
        <svg
          className="h-6 w-6 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">
        Message Sent!
      </h3>
      <p className="mb-6 text-foreground-secondary">
        Thanks for reaching out. I&apos;ll get back to you within 24-48 hours.
      </p>
      <Button
        variant="outline"
        onClick={onSendAnother}
        className="border-border hover:border-primary hover:text-primary"
      >
        Send Another Message
      </Button>
    </div>
  )
}
