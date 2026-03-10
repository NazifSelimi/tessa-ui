import React from 'react'
import { DatePicker } from 'antd'
import type { DatePickerProps } from 'antd'

export type CalendarProps = DatePickerProps

const Calendar = React.forwardRef<any, CalendarProps>(
  (props, ref) => {
    return <DatePicker ref={ref} {...props} />
  }
)

Calendar.displayName = 'Calendar'

export { Calendar }
