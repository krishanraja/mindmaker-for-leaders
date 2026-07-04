// src/components/settings/EditableField.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Edit2, Check, X } from 'lucide-react'

interface EditableFieldProps {
  label: string
  value: string
  onSave: (value: string) => void
  type?: 'text' | 'textarea' | 'select'
  options?: string[]
  placeholder?: string
  helpText?: string
}

export function EditableField({
  label,
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder,
  helpText,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <div className="flex items-start justify-between py-2">
        <div className="flex-1">
          <Label className="text-muted-foreground text-sm">{label}</Label>
          <p className="text-foreground mt-1">{value || <span className="text-muted-foreground/60">Not set</span>}</p>
          {helpText && <p className="text-xs text-muted-foreground mt-1">{helpText}</p>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="ml-4"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="py-2 space-y-2">
      <Label>{label}</Label>

      {type === 'text' && (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={placeholder}
        />
      )}

      {type === 'textarea' && (
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px]"
        />
      )}

      {type === 'select' && (
        <Select value={editValue} onValueChange={setEditValue}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={handleSave}>
          <Check className="h-4 w-4 mr-1" />
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
