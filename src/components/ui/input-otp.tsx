import React from 'react'
import { Input } from 'antd'
import type { InputRef, InputProps } from 'antd'

const InputOTP = React.forwardRef<
  InputRef,
  InputProps & { containerClassName?: string }
>(({ className, containerClassName, ...props }, ref) => (
  <div className={containerClassName}>
    <Input
      ref={ref}
      type="number"
      maxLength={6}
      className={className}
      placeholder="000000"
      {...props}
    />
  </div>
))
InputOTP.displayName = 'InputOTP'

const InputOTPGroup = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={className} {...props} />
))
InputOTPGroup.displayName = 'InputOTPGroup'

const InputOTPSlot = React.forwardRef<
  InputRef,
  InputProps & { index: number }
>(({ index: _index, className, ...props }, ref) => (
  <Input ref={ref} className={className} maxLength={1} {...props} />
))
InputOTPSlot.displayName = 'InputOTPSlot'

export { InputOTP, InputOTPGroup, InputOTPSlot }
