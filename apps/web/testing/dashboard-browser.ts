export class DashboardEventSource extends EventTarget {
  static instances: Array<DashboardEventSource> = []
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  closed = false

  constructor(readonly url: string) {
    super()
    DashboardEventSource.instances.push(this)
  }
  close() {
    this.closed = true
  }
}
