import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LabelledSelectProps extends ComponentPropsWithoutRef<typeof Select> {
  label: string;
  id?: string;
  placeholder?: string;
  children: ReactNode;
}

export function LabelledSelect({
  label,
  id,
  placeholder,
  children,
  ...props
}: LabelledSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select {...props}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
