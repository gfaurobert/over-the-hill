import { render, screen } from '@testing-library/react'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'

describe('Card UI', () => {
  it('renders the full card composition with forwarded refs and class names', () => {
    const cardRef = { current: null as HTMLDivElement | null }
    const headerRef = { current: null as HTMLDivElement | null }
    const titleRef = { current: null as HTMLDivElement | null }
    const descRef = { current: null as HTMLDivElement | null }
    const contentRef = { current: null as HTMLDivElement | null }
    const footerRef = { current: null as HTMLDivElement | null }

    render(
      <Card ref={cardRef} data-testid="card" className="card-custom">
        <CardHeader ref={headerRef} data-testid="card-header" className="header-custom">
          <CardTitle ref={titleRef} data-testid="card-title" className="title-custom">
            Title
          </CardTitle>
          <CardDescription ref={descRef} data-testid="card-description" className="desc-custom">
            Description
          </CardDescription>
        </CardHeader>
        <CardContent ref={contentRef} data-testid="card-content" className="content-custom">
          Content
        </CardContent>
        <CardFooter ref={footerRef} data-testid="card-footer" className="footer-custom">
          Footer
        </CardFooter>
      </Card>
    )

    expect(cardRef.current).not.toBeNull()
    expect(headerRef.current).not.toBeNull()
    expect(titleRef.current).not.toBeNull()
    expect(descRef.current).not.toBeNull()
    expect(contentRef.current).not.toBeNull()
    expect(footerRef.current).not.toBeNull()

    expect(screen.getByTestId('card').className).toContain('card-custom')
    expect(screen.getByTestId('card').className).toContain('rounded-lg')
    expect(screen.getByTestId('card-header').className).toContain('header-custom')
    expect(screen.getByTestId('card-header').className).toContain('p-6')
    expect(screen.getByTestId('card-title').className).toContain('title-custom')
    expect(screen.getByTestId('card-title').className).toContain('font-semibold')
    expect(screen.getByTestId('card-description').className).toContain('desc-custom')
    expect(screen.getByTestId('card-description').className).toContain('text-muted-foreground')
    expect(screen.getByTestId('card-content').className).toContain('content-custom')
    expect(screen.getByTestId('card-content').className).toContain('pt-0')
    expect(screen.getByTestId('card-footer').className).toContain('footer-custom')
    expect(screen.getByTestId('card-footer').className).toContain('items-center')
  })
})
