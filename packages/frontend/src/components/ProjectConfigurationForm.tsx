import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LabelledInput } from "@/components/ui/labelled-input";

interface ProjectConfigurationFormProps {
  initialName?: string;
  initialTargetPath?: string;
  onSubmit: (data: {
    name: string;
    targetProjectPath: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  onSubmittingChange?: (isSubmitting: boolean) => void;
}

interface FormData {
  name: string;
  targetProjectPath: string;
}

export function ProjectConfigurationForm({
  initialName = "",
  initialTargetPath = "",
  onSubmit,
  isSubmitting,
  onSubmittingChange,
}: ProjectConfigurationFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: initialName,
      targetProjectPath: initialTargetPath,
    },
  });

  const targetProjectPath = watch("targetProjectPath");
  const name = watch("name");

  useEffect(() => {
    if (targetProjectPath && !name) {
      const pathParts = targetProjectPath.split("/").filter(Boolean);
      const folderName = pathParts[pathParts.length - 1];
      if (folderName) {
        setValue("name", folderName);
      }
    }
  }, [targetProjectPath, name, setValue]);

  const onFormSubmit = async (data: FormData) => {
    onSubmittingChange?.(true);
    try {
      await onSubmit({
        name: data.name,
        targetProjectPath: data.targetProjectPath,
      });
    } finally {
      onSubmittingChange?.(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onFormSubmit)(e);
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <LabelledInput
          label="Target Project Path"
          id="targetProjectPath"
          type="text"
          {...register("targetProjectPath", {
            required: "Project path is required",
          })}
          disabled={isSubmitting}
          required
          placeholder="e.g., ../my-project or /absolute/path/to/project"
        />
        <p className="text-muted-foreground text-xs mt-1">
          Relative path from promptalicious or absolute path to your project
        </p>
        {errors.targetProjectPath && (
          <p className="text-destructive text-sm mt-1">
            {errors.targetProjectPath.message}
          </p>
        )}
      </div>

      <div>
        <LabelledInput
          label="Project Name"
          id="name"
          type="text"
          {...register("name", {
            required: "Project name is required",
          })}
          disabled={isSubmitting}
          required
          placeholder="e.g., my-project"
        />
        <p className="text-muted-foreground text-xs mt-1">
          Defaults to folder name, but you can customise it
        </p>
        {errors.name && (
          <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Saving..." : "Save Project Configuration"}
        </Button>
      </div>
    </form>
  );
}
