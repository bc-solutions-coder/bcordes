'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { submitInquiry } from '~/server-fns/inquiries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const projectTypeValues = [
  'Frontend',
  'Full-Stack',
  'Consulting',
  'Other',
] as const
const budgetValues = ['Under $5k', '$5k-$15k', '$15k-$50k', '$50k+'] as const
const timelineValues = [
  'Less than 1 month',
  '1-3 months',
  '3-6 months',
  '6+ months',
] as const

const contactFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  projectType: z.enum(projectTypeValues, {
    message: 'Please select a project type',
  }),
  budgetRange: z.enum(budgetValues, {
    message: 'Please select a budget range',
  }),
  timeline: z.enum(timelineValues, {
    message: 'Please select a timeline',
  }),
  message: z
    .string()
    .min(1, 'Message is required')
    .min(10, 'Message must be at least 10 characters'),
})

type ContactFormValues = z.infer<typeof contactFormSchema>

const projectTypeOptions = [
  { value: 'Frontend', label: 'Frontend Development' },
  { value: 'Full-Stack', label: 'Full-Stack Development' },
  { value: 'Consulting', label: 'Technical Consulting' },
  { value: 'Other', label: 'Other' },
] as const

const budgetOptions = [
  { value: 'Under $5k', label: 'Under $5k' },
  { value: '$5k-$15k', label: '$5k - $15k' },
  { value: '$15k-$50k', label: '$15k - $50k' },
  { value: '$50k+', label: '$50k+' },
] as const

const timelineOptions = [
  { value: 'Less than 1 month', label: 'Less than 1 month' },
  { value: '1-3 months', label: '1 - 3 months' },
  { value: '3-6 months', label: '3 - 6 months' },
  { value: '6+ months', label: '6+ months' },
] as const

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      projectType: undefined,
      budgetRange: undefined,
      timeline: undefined,
      message: '',
    },
  })

  async function onSubmit(data: ContactFormValues) {
    setIsSubmitting(true)

    try {
      await submitInquiry({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          company: data.company || undefined,
          projectType: data.projectType,
          budgetRange: data.budgetRange,
          timeline: data.timeline,
          message: data.message,
        },
      })

      toast.success('Message sent successfully!', {
        description: "Thanks for reaching out. I'll get back to you soon.",
      })

      setIsSubmitted(true)
      form.reset()
    } catch (error) {
      console.error('Contact form submission error:', error)
      toast.error('Failed to send message', {
        description: 'Please try again or email me directly.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="rounded-lg border border-border-default bg-background-secondary p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/20">
          <svg
            className="h-6 w-6 text-accent-primary"
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
        <h3 className="mb-2 text-lg font-semibold text-text-primary">
          Message Sent!
        </h3>
        <p className="mb-6 text-text-secondary">
          Thanks for reaching out. I&apos;ll get back to you within 24-48 hours.
        </p>
        <Button
          variant="outline"
          onClick={() => setIsSubmitted(false)}
          className="border-border-default hover:border-accent-primary hover:text-accent-secondary"
        >
          Send Another Message
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-text-primary">
                  Name <span className="text-accent-primary">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
                    className="border-border-default bg-background-secondary text-text-primary placeholder:text-text-tertiary focus-visible:border-accent-primary focus-visible:ring-accent-primary/50"
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
                <FormLabel className="text-text-primary">
                  Email <span className="text-accent-primary">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    className="border-border-default bg-background-secondary text-text-primary placeholder:text-text-tertiary focus-visible:border-accent-primary focus-visible:ring-accent-primary/50"
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
              <FormLabel className="text-text-primary">Phone</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  className="border-border-default bg-background-secondary text-text-primary placeholder:text-text-tertiary focus-visible:border-accent-primary focus-visible:ring-accent-primary/50"
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
              <FormLabel className="text-text-primary">Company</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your company (optional)"
                  className="border-border-default bg-background-secondary text-text-primary placeholder:text-text-tertiary focus-visible:border-accent-primary focus-visible:ring-accent-primary/50"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="projectType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-text-primary">
                  Project Type <span className="text-accent-primary">*</span>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full border-border-default bg-background-secondary text-text-primary focus:border-accent-primary focus:ring-accent-primary/50 data-[placeholder]:text-text-tertiary">
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="border-border-default bg-background-secondary">
                    {projectTypeOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="text-text-primary focus:bg-accent-primary/20 focus:text-accent-secondary"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="budgetRange"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-text-primary">
                  Budget Range <span className="text-accent-primary">*</span>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full border-border-default bg-background-secondary text-text-primary focus:border-accent-primary focus:ring-accent-primary/50 data-[placeholder]:text-text-tertiary">
                      <SelectValue placeholder="Select budget range" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="border-border-default bg-background-secondary">
                    {budgetOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="text-text-primary focus:bg-accent-primary/20 focus:text-accent-secondary"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="timeline"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">
                Timeline <span className="text-accent-primary">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full border-border-default bg-background-secondary text-text-primary focus:border-accent-primary focus:ring-accent-primary/50 data-[placeholder]:text-text-tertiary">
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="border-border-default bg-background-secondary">
                  {timelineOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-text-primary focus:bg-accent-primary/20 focus:text-accent-secondary"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-text-primary">
                Message <span className="text-accent-primary">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell me about your project..."
                  className="min-h-32 resize-none border-border-default bg-background-secondary text-text-primary placeholder:text-text-tertiary focus-visible:border-accent-primary focus-visible:ring-accent-primary/50"
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
          className="w-full bg-accent-primary text-white hover:bg-accent-tertiary focus-visible:ring-accent-primary/50 disabled:opacity-50 sm:w-auto"
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
