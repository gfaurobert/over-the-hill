import { render, screen } from '@testing-library/react'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select'

describe('Select UI', () => {
  it('renders the trigger with current value and accessibility attributes', () => {
    render(
      <Select defaultValue="alpha">
        <SelectTrigger aria-label="Example Select">
          <SelectValue placeholder="Choose an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="alpha">Alpha</SelectItem>
          <SelectItem value="beta">Beta</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByRole('combobox', { name: 'Example Select' })
    expect(trigger).toHaveTextContent('Alpha')

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('data-state', 'closed')
  })

  it('exports all named primitives used in the app', () => {
    expect(SelectGroup).toBeDefined()
    expect(SelectLabel).toBeDefined()
    expect(SelectSeparator).toBeDefined()
    expect(SelectScrollUpButton).toBeDefined()
    expect(SelectScrollDownButton).toBeDefined()
  })
})
