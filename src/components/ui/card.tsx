import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-surface-1 border border-border rounded-2xl overflow-hidden', className)} {...props} />
)

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-between px-5 py-3.5 border-b border-border', className)} {...props} />
)

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('text-xs font-semibold text-fg-secondary uppercase tracking-wide', className)} {...props} />
)

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5', className)} {...props} />
)
