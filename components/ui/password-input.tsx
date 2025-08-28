import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    // Always start with hidden state (security requirement)
    const [isVisible, setIsVisible] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Use the forwarded ref or our internal ref
    const resolvedRef = (ref as React.RefObject<HTMLInputElement>) || inputRef

    // Security safeguard: Reset visibility on component unmount
    React.useEffect(() => {
      return () => {
        // Cleanup: ensure password is hidden when component unmounts
        setIsVisible(false)
      }
    }, [])

    // Security safeguard: Hide password when navigating away from page
    React.useEffect(() => {
      const handleBeforeUnload = () => {
        setIsVisible(false)
      }

      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Hide password when tab becomes inactive
          setIsVisible(false)
        }
      }

      window.addEventListener('beforeunload', handleBeforeUnload)
      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }, [])

    const toggleVisibility = () => {
      const input = resolvedRef.current
      let cursorPosition = 0
      
      // Store cursor position before toggle
      if (input) {
        cursorPosition = input.selectionStart || 0
      }
      
      setIsVisible(prev => {
        // Use setTimeout to restore cursor position after DOM update
        setTimeout(() => {
          if (input) {
            input.setSelectionRange(cursorPosition, cursorPosition)
          }
        }, 0)
        return !prev
      })
    }

    return (
      <div className="relative">
        <input
          type={isVisible ? "text" : "password"}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          ref={resolvedRef}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={toggleVisibility}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggleVisibility()
            }
          }}
          disabled={props.disabled}
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          tabIndex={0}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">
            {isVisible ? "Hide password" : "Show password"}
          </span>
        </Button>
      </div>
    )
  }
)

PasswordInput.displayName = "PasswordInput"

export { PasswordInput }