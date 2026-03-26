import { z } from 'zod'

export const projectTypeValues = [
  'Frontend',
  'Full-Stack',
  'Consulting',
  'Other',
] as const

export const budgetValues = [
  'Under $5k',
  '$5k-$15k',
  '$15k-$50k',
  '$50k+',
] as const

export const timelineValues = [
  'Less than 1 month',
  '1-3 months',
  '3-6 months',
  '6+ months',
] as const

export const contactFormSchema = z.object({
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

export type ContactFormValues = z.infer<typeof contactFormSchema>

export const projectTypeOptions = [
  { value: 'Frontend', label: 'Frontend Development' },
  { value: 'Full-Stack', label: 'Full-Stack Development' },
  { value: 'Consulting', label: 'Technical Consulting' },
  { value: 'Other', label: 'Other' },
] as const

export const budgetOptions = [
  { value: 'Under $5k', label: 'Under $5k' },
  { value: '$5k-$15k', label: '$5k - $15k' },
  { value: '$15k-$50k', label: '$15k - $50k' },
  { value: '$50k+', label: '$50k+' },
] as const

export const timelineOptions = [
  { value: 'Less than 1 month', label: 'Less than 1 month' },
  { value: '1-3 months', label: '1 - 3 months' },
  { value: '3-6 months', label: '3 - 6 months' },
  { value: '6+ months', label: '6+ months' },
] as const
