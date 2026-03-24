import { fireEvent, render, screen } from '@testing-library/react'

import { Switch } from './switch'

describe('Switch UI', () => {
  it('toggles checked state and keeps accessibility semantics', () => {
    render(<Switch aria-label="Enable feature" />)

    const toggle = screen.getByRole('switch', { name: 'Enable feature' })
    expect(toggle).toHaveAttribute('data-state', 'unchecked')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('data-state', 'checked')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('data-state', 'unchecked')
  })
})
