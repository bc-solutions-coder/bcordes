import type { Control, FieldPath, FieldValues } from 'react-hook-form'

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SelectOption {
  readonly value: string
  readonly label: string
}

interface SelectFormFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder: string
  options: ReadonlyArray<SelectOption>
  required?: boolean
}

export function SelectFormField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  required,
}: SelectFormFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-text-primary">
            {label} {required && <span className="text-accent-primary">*</span>}
          </FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger
                tabIndex={0}
                className="w-full border-border-default bg-background-secondary text-text-primary focus:border-accent-primary focus:ring-accent-primary/50 data-[placeholder]:text-text-tertiary"
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="border-border-default bg-background-secondary">
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-text-primary focus:bg-accent-primary/20 focus:text-accent-secondary"
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
