import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "danger" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    let variantStyles = ""
    if (variant === "default") variantStyles = "bg-[#111] text-white hover:bg-black shadow-[0_1px_2px_rgba(0,0,0,0.1)] border border-transparent"
    else if (variant === "secondary") variantStyles = "bg-[#F4F4F5] text-black hover:bg-[#E4E4E7] border border-transparent"
    else if (variant === "outline") variantStyles = "border border-[#E4E4E7] bg-white text-black hover:bg-[#F4F4F5]"
    else if (variant === "danger") variantStyles = "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
    else if (variant === "ghost") variantStyles = "hover:bg-[#F4F4F5] text-black"

    let sizeStyles = "h-9 px-4 py-2"
    if (size === "sm") sizeStyles = "h-8 rounded-md px-3 text-xs"
    if (size === "lg") sizeStyles = "h-10 rounded-md px-8"
    if (size === "icon") sizeStyles = "h-9 w-9 p-0 flex items-center justify-center"

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111] disabled:pointer-events-none disabled:opacity-50 ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
