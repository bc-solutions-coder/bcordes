import { Button } from './button'
import type { ComponentProps } from 'react'

// CSF3 story for the @bcordes/ui Button. Storybook's toolchain (and its
// `Meta`/`StoryObj` types) lives in apps/web, not in this leaf package, so the
// meta/story objects are authored untyped here — Storybook infers the CSF3
// shape at build time. apps/web/.storybook/main.ts globs
// `../../../packages/*/src/**/*.stories.*`, which is what makes this render.
const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    children: 'Button',
    variant: 'default',
    size: 'default',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
      ],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon', 'icon-sm', 'icon-lg'],
    },
    disabled: {
      control: 'boolean',
    },
  },
}

export default meta

export const Default = {}

export const Secondary = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
}

export const Destructive = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
}

export const Outline = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
}

export const Ghost = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
}

export const Link = {
  args: {
    variant: 'link',
    children: 'Link',
  },
}

export const Small = {
  args: {
    size: 'sm',
    children: 'Small',
  },
}

export const Large = {
  args: {
    size: 'lg',
    children: 'Large',
  },
}

export const Disabled = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
}

export const Variants = {
  render: (args: ComponentProps<typeof Button>) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="default">
        Default
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="destructive">
        Destructive
      </Button>
      <Button {...args} variant="outline">
        Outline
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="link">
        Link
      </Button>
    </div>
  ),
}
