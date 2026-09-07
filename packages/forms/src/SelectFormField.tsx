import { cn } from '@bcordes/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@bcordes/ui/components/select'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'

export interface SelectOption {
  readonly value: string
  readonly label: string
}

export interface SelectFormFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder: string
  options: ReadonlyArray<SelectOption>
  required?: boolean
  /** Merged with the default trigger classes. */
  triggerClassName?: string
  /** Merged with the default content classes. */
  contentClassName?: string
}

const DEFAULT_TRIGGER_CLASS_NAME =
  'w-full border-border bg-secondary text-foreground focus:border-primary focus:ring-primary/50 data-[placeholder]:text-muted-foreground'
const DEFAULT_CONTENT_CLASS_NAME = 'border-border bg-secondary'

export function SelectFormField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  required,
  triggerClassName,
  contentClassName,
}: SelectFormFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-foreground">
            {label} {required && <span className="text-primary">*</span>}
          </FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger
                tabIndex={0}
                className={cn(DEFAULT_TRIGGER_CLASS_NAME, triggerClassName)}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent
              className={cn(DEFAULT_CONTENT_CLASS_NAME, contentClassName)}
            >
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-foreground focus:bg-primary/20 focus:text-primary"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
