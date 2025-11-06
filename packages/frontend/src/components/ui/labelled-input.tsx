import type { ComponentPropsWithoutRef } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LabelledInputProps extends ComponentPropsWithoutRef<typeof Input> {
  label: string;
}

export function LabelledInput({ label, id, ...props }: LabelledInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  );
}
