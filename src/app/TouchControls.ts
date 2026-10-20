type Stick = 'move' | 'aim';
type Action = 'dash' | 'interact' | 'detonate';
type Contact = { element: HTMLElement; stick?: Stick; action?: Action };

export class TouchControls {
  readonly enabled = navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches;
  move = { x: 0, y: 0 };
  aim = { x: 0, y: -1 };
  firing = false;
  actions = { dash: false, interact: false, detonate: false };
  private buffered = { dash: 0, detonate: 0 };
  private contacts = new Map<number, Contact>();
  private binding?: AbortController;

  bind(root: HTMLElement, active: () => boolean) {
    this.clear();
    this.binding?.abort();
    this.binding = new AbortController();
    const options = { signal: this.binding.signal };
    for (const element of root.querySelectorAll<HTMLElement>('[data-stick], [data-touch-action]')) {
      element.addEventListener('contextmenu', (event) => event.preventDefault(), options);
      element.addEventListener(
        'pointerdown',
        (event) => {
          if (!active() || event.button !== 0) return;
          event.preventDefault();
          if ([...this.contacts.values()].some((contact) => contact.element === element)) return;
          const contact: Contact = {
            element,
            stick: element.dataset.stick as Stick | undefined,
            action: element.dataset.touchAction as Action | undefined,
          };
          this.contacts.set(event.pointerId, contact);
          element.setPointerCapture(event.pointerId);
          element.classList.add('held');
          if (contact.action) {
            this.actions[contact.action] = true;
            if (contact.action !== 'interact') this.buffered[contact.action] = 0.18;
          }
          this.update(event);
        },
        options,
      );
      element.addEventListener(
        'pointermove',
        (event) => {
          if (this.contacts.has(event.pointerId)) {
            event.preventDefault();
            this.update(event);
          }
        },
        options,
      );
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
        element.addEventListener(
          name,
          (event) => this.release(event.pointerId, event.type !== 'pointerup'),
          options,
        );
    }
  }

  private update(event: PointerEvent) {
    const contact = this.contacts.get(event.pointerId);
    if (!contact?.stick) return;
    const box = contact.element.getBoundingClientRect();
    const radius = box.width * 0.35;
    const dx = (event.clientX - box.left - box.width / 2) / radius;
    const dy = (event.clientY - box.top - box.height / 2) / radius;
    const distance = Math.hypot(dx, dy);
    const x = distance > 0.12 ? dx / Math.max(1, distance) : 0;
    const y = distance > 0.12 ? dy / Math.max(1, distance) : 0;
    contact.element.style.setProperty('--stick-x', `${x * radius}px`);
    contact.element.style.setProperty('--stick-y', `${y * radius}px`);
    if (contact.stick === 'move') this.move = { x, y };
    else {
      this.firing = distance > 0.12;
      if (this.firing) this.aim = { x, y };
    }
  }

  private release(id: number, cancelled = false) {
    const contact = this.contacts.get(id);
    if (!contact) return;
    this.contacts.delete(id);
    contact.element.classList.remove('held');
    contact.element.style.setProperty('--stick-x', '0px');
    contact.element.style.setProperty('--stick-y', '0px');
    if (contact.stick === 'move') this.move = { x: 0, y: 0 };
    if (contact.stick === 'aim') this.firing = false;
    if (contact.action) this.actions[contact.action] = false;
    if (cancelled && contact.action && contact.action !== 'interact')
      this.buffered[contact.action] = 0;
    if (contact.element.hasPointerCapture(id)) contact.element.releasePointerCapture(id);
  }

  clear() {
    for (const id of [...this.contacts.keys()]) this.release(id);
    this.move = { x: 0, y: 0 };
    this.firing = false;
    this.actions = { dash: false, interact: false, detonate: false };
    this.buffered = { dash: 0, detonate: 0 };
  }

  action(name: Action) {
    return this.actions[name] || (name !== 'interact' && this.buffered[name] > 0);
  }

  advance() {
    for (const name of ['dash', 'detonate'] as const)
      this.buffered[name] = Math.max(0, this.buffered[name] - 1 / 60);
  }
}
