"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { colors } from "@/constants/content"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      {...props}
      className={cn(
        "peer border-gray-400 dark:bg-input/30 w-6 h-6 shrink-0 rounded-md border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        backgroundColor: props.checked ? colors.primary : undefined,
        borderColor: props.checked ? colors.primary : undefined,
        color: props.checked ? "#fff" : undefined,
      }}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="w-4 h-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
