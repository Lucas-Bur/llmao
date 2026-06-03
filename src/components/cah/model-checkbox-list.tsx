import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AVAILABLE_MODELS, lookupModelName } from "@/constants/models"

type Props = {
  selectedModels: string[]
  onChange: (updated: string[]) => void
  idPrefix: string
  footer?: string
}

export function ModelCheckboxList({
  selectedModels,
  onChange,
  idPrefix,
  footer,
}: Props) {
  return (
    <div>
      {AVAILABLE_MODELS.map((model) => (
        <div key={model} className="flex items-center gap-2 py-1">
          <Checkbox
            id={`${idPrefix}-${model}`}
            checked={selectedModels.includes(model)}
            onCheckedChange={(checked) => {
              const updated = checked
                ? [...selectedModels, model]
                : selectedModels.filter((m) => m !== model)
              onChange(updated)
            }}
          />
          <Label htmlFor={`${idPrefix}-${model}`} className="text-sm">
            {lookupModelName(model)}
          </Label>
        </div>
      ))}
      {footer && (
        <p className="mt-1 text-xs text-muted-foreground">{footer}</p>
      )}
    </div>
  )
}
