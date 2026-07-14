import { SelectFormField } from './SelectFormField'
import {
  budgetOptions,
  projectTypeOptions,
  timelineOptions,
} from './contact-form.schema'
import type { UseFormReturn } from 'react-hook-form'
import type { ContactFormValues } from './contact-form.schema'
import { Button } from '@/components/ui/shadcn/button'
import { Input } from '@/components/ui/shadcn/input'
import { Textarea } from '@/components/ui/shadcn/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/shadcn/form'

interface ContactFormFieldsProps {
  form: UseFormReturn<ContactFormValues>
  onSubmit: (data: ContactFormValues) => void
  isSubmitting: boolean
  disabledFields?: {
    name?: boolean
    email?: boolean
  }
}

export function ContactFormFields({
  form,
  onSubmit,
  isSubmitting,
  disabledFields,
}: ContactFormFieldsProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">
                  Name <span className="text-primary">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    disabled={disabledFields?.name}
                    className="border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-70"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">
                  Email <span className="text-primary">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    disabled={disabledFields?.email}
                    className="border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-70"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Phone</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  className="border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/50"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">Company</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your company (optional)"
                  className="border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/50"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <SelectFormField
            control={form.control}
            name="projectType"
            label="Project Type"
            placeholder="Select project type"
            options={projectTypeOptions}
            required
          />

          <SelectFormField
            control={form.control}
            name="budgetRange"
            label="Budget Range"
            placeholder="Select budget range"
            options={budgetOptions}
            required
          />
        </div>

        <SelectFormField
          control={form.control}
          name="timeline"
          label="Timeline"
          placeholder="Select timeline"
          options={timelineOptions}
          required
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-foreground">
                Message <span className="text-primary">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell me about your project..."
                  className="min-h-32 resize-none border-border bg-secondary text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/50"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary/50 disabled:opacity-50 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Sending...
            </>
          ) : (
            'Send Message'
          )}
        </Button>
      </form>
    </Form>
  )
}
