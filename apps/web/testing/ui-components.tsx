import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { Form, SelectFormField } from '@bcordes/forms'
import { MainNav, MobileNav } from '@bcordes/navigation'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@bcordes/ui/components/avatar'
import { Badge } from '@bcordes/ui/components/badge'
import { Button } from '@bcordes/ui/components/button'
import { Checkbox } from '@bcordes/ui/components/checkbox'
import { Label } from '@bcordes/ui/components/label'
import { Progress } from '@bcordes/ui/components/progress'
import { Separator } from '@bcordes/ui/components/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@bcordes/ui/components/sheet'
import { Switch } from '@bcordes/ui/components/switch'
import './ui-components.css'

function FormSelect({ custom }: { custom: boolean }) {
  const form = useForm({ defaultValues: { kind: '' } })
  return (
    <Form {...form}>
      <SelectFormField
        control={form.control}
        name="kind"
        label={custom ? 'Custom choice' : 'Default choice'}
        placeholder="Choose"
        options={[{ label: 'First', value: 'first' }]}
        triggerClassName={custom ? 'border-4' : undefined}
        contentClassName={custom ? 'border-4' : undefined}
      />
    </Form>
  )
}

function SheetScene() {
  const side = new URLSearchParams(location.search).get('side')
  const selected =
    side === 'top' || side === 'right' || side === 'bottom' || side === 'left'
      ? side
      : undefined
  return (
    <Sheet>
      <SheetTrigger>Open sheet</SheetTrigger>
      <SheetContent side={selected}>
        <SheetHeader>
          <SheetTitle>Placement</SheetTitle>
        </SheetHeader>
        <p>Sheet body</p>
      </SheetContent>
    </Sheet>
  )
}

function NavigationScene() {
  const mobile = new URLSearchParams(location.search).get('mobile') === 'true'
  const [open, setOpen] = useState(true)
  const items = [
    { label: 'Projects', to: '/projects', exact: true },
    { label: 'About', to: '/about' },
  ]
  return mobile ? (
    <MobileNav items={items} open={open} onOpenChange={setOpen} />
  ) : (
    <MainNav items={items} />
  )
}

function Scene() {
  const [progress, setProgress] = useState(20)
  const scene = new URLSearchParams(location.search).get('scene')
  if (scene === 'sheet') return <SheetScene />
  if (scene === 'navigation') return <NavigationScene />
  return (
    <main style={{ padding: 24, display: 'grid', gap: 24 }}>
      <section
        aria-label="Button variants"
        style={{ display: 'flex', gap: 12 }}
      >
        {(
          [
            'default',
            'destructive',
            'outline',
            'secondary',
            'ghost',
            'link',
          ] as const
        ).map((variant) => (
          <Button key={variant} variant={variant}>
            {variant} button
          </Button>
        ))}
      </section>
      <section
        aria-label="Button sizes"
        style={{ display: 'flex', alignItems: 'center', gap: 12 }}
      >
        {(['default', 'sm', 'lg', 'icon', 'icon-sm', 'icon-lg'] as const).map(
          (size) => (
            <Button key={size} size={size} aria-label={`${size} size`}>
              {size.startsWith('icon') ? '+' : 'Action'}
            </Button>
          ),
        )}
      </section>
      <section aria-label="Badge variants" style={{ display: 'flex', gap: 12 }}>
        <Badge>default badge</Badge>
        <Badge variant="secondary">secondary badge</Badge>
        <Badge variant="destructive">destructive badge</Badge>
        <Badge variant="outline">outline badge</Badge>
      </section>
      <section
        aria-label="Caller customization"
        style={{ display: 'flex', alignItems: 'center', gap: 18 }}
      >
        <Button>Default border</Button>
        <Button className="border-4">Custom border</Button>
        <Badge>Default badge border</Badge>
        <Badge className="border-4">Custom badge border</Badge>
        <Checkbox aria-label="Default checkbox border" />
        <Checkbox aria-label="Custom checkbox border" className="border-4" />
        <Switch aria-label="Default switch border" />
        <Switch aria-label="Custom switch border" className="border-4" />
      </section>
      <section
        aria-label="Checkbox appearance"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: 12,
          width: 130,
        }}
      >
        <Checkbox aria-label="Unchecked choice" />
        <Checkbox aria-label="Checked choice" defaultChecked />
      </section>
      <section
        aria-label="Switch appearance"
        style={{ display: 'flex', gap: 24 }}
      >
        <Switch aria-label="Default toggle" />
        <Switch size="sm" aria-label="Small toggle" />
      </section>
      <section aria-label="Progress appearance" style={{ width: 300 }}>
        <Progress aria-label="Completion" value={progress} />
        <Button onClick={() => setProgress(60)}>Set sixty</Button>
        <Button onClick={() => setProgress(100)}>Set complete</Button>
      </section>
      <section
        aria-label="Avatar appearance"
        style={{ display: 'flex', gap: 16 }}
      >
        <Avatar aria-label="Successful avatar">
          <AvatarImage src="/avatar-success.svg" alt="Loaded portrait" />
          <AvatarFallback>OK</AvatarFallback>
        </Avatar>
        <Avatar aria-label="Failed avatar">
          <AvatarImage src="/avatar-failed.svg" alt="Unavailable portrait" />
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
        <Avatar aria-label="Ring avatar" className="ring-2">
          <AvatarFallback>CD</AvatarFallback>
        </Avatar>
      </section>
      <section
        aria-label="Label appearance"
        style={{ display: 'flex', gap: 24 }}
      >
        <div>
          <input id="enabled-label" className="peer" />
          <Label htmlFor="enabled-label">Enabled label</Label>
        </div>
        <div>
          <input id="disabled-label" className="peer" disabled />
          <Label htmlFor="disabled-label">Disabled label</Label>
        </div>
        <Label>Default label color</Label>
        <Label className="text-red-500">Custom label color</Label>
      </section>
      <section
        aria-label="Separator appearance"
        style={{ display: 'flex', width: 300, height: 60, gap: 12 }}
      >
        <div style={{ width: 120 }}>
          <Separator aria-label="Horizontal divider" />
          <Separator aria-label="Custom divider" className="bg-red-500" />
        </div>
        <Separator orientation="vertical" aria-label="Vertical divider" />
        <span style={{ minWidth: 200 }}>Constrained flex content</span>
      </section>
      <section
        aria-label="Form customization"
        style={{ display: 'flex', gap: 24 }}
      >
        <FormSelect custom={false} />
        <FormSelect custom />
      </section>
    </main>
  )
}
const route = createRootRoute({ component: Scene })
const router = createRouter({
  routeTree: route.addChildren(
    ['/projects', '/about'].map((path) =>
      createRoute({ getParentRoute: () => route, path, component: () => null }),
    ),
  ),
  history: createMemoryHistory({ initialEntries: ['/projects'] }),
})
const root = document.getElementById('root')
if (!root) throw new Error('UI fixture root is missing')
createRoot(root).render(<RouterProvider router={router} />)
