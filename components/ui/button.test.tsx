import { render, screen } from '@testing-library/react'

import { Button, buttonVariants } from './button'

describe('Button UI', () => {
  it('renders a native button with default variants', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button.tagName).toBe('BUTTON')
    expect(button.className).toContain('bg-primary')
    expect(button.className).toContain('h-10')
  })

  it('renders as a Slot when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/target">Go</a>
      </Button>
    )
    const link = screen.getByRole('link', { name: 'Go' })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('/target')
    expect(link.className).toContain('bg-primary')
  })

  it('applies every documented variant and size', () => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const
    const sizes = ['default', 'sm', 'lg', 'icon'] as const
    for (const variant of variants) {
      for (const size of sizes) {
        const classes = buttonVariants({ variant, size })
        expect(typeof classes).toBe('string')
        expect(classes.length).toBeGreaterThan(0)
      }
    }
  })

  it('forwards refs and additional class names', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(
      <Button ref={ref} className="custom-class" variant="outline" size="sm">
        Hello
      </Button>
    )
    expect(ref.current).not.toBeNull()
    const button = screen.getByRole('button', { name: 'Hello' })
    expect(button.className).toContain('custom-class')
  })
})
