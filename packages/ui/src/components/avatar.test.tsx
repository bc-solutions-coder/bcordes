import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@bcordes/ui/components/avatar'

describe('Avatar fallback content', () => {
  it('shows supplied initials when no image is available', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    )
    expect(screen.getByText('AB')).toBeVisible()
  })
  it('keeps fallback content available while an image is not yet loaded', () => {
    render(
      <Avatar>
        <AvatarImage src="/pending-portrait.png" alt="Portrait" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    )
    expect(screen.getByText('AB')).toBeVisible()
  })
})
