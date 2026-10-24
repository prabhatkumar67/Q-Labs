import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  let variantClass = "border-transparent bg-black text-white hover:bg-black/80"

  switch (variant) {
    case "secondary":
      variantClass = "border-transparent bg-muted text-muted-foreground hover:bg-muted/80"
      break
    case "destructive":
      variantClass = "border-transparent bg-red-600 text-white hover:bg-red-600/80"
      break
    case "outline":
      variantClass = "text-foreground"
      break
  }

  return (
    <div
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm ${variantClass} ${className}`}
      {...props}
    />
  )
}
