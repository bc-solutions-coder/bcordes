'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { contactFormSchema } from './contact-form.schema'
import { ContactFormFields } from './ContactFormFields'
import { ContactFormSuccess } from './ContactFormSuccess'
import type { ContactFormValues } from './contact-form.schema'
import { useUser } from '@/hooks/useUser'
import { submitInquiry } from '@/server-fns/inquiries'

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { user } = useUser()

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

  useEffect(() => {
    if (user?.email) {
      form.setValue('email', user.email)
    }
    if (user?.name) {
      form.setValue('name', user.name)
    }
  }, [user?.email, user?.name, form])

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
    return <ContactFormSuccess onSendAnother={() => setIsSubmitted(false)} />
  }

  return (
    <ContactFormFields
      form={form}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      disabledFields={{
        name: !!user?.name,
        email: !!user?.email,
      }}
    />
  )
}
