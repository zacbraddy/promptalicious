import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "border-2 text-zinc-50 rounded-lg shadow-xl p-5 flex items-center gap-3 text-lg font-medium min-w-[400px]",
          success: "bg-green-900/90 border-green-500 text-green-50",
          error: "bg-red-900/90 border-red-500 text-red-50",
          warning: "bg-yellow-900/90 border-yellow-500 text-yellow-50",
          info: "bg-blue-900/90 border-blue-500 text-blue-50",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-6" />,
        info: <InfoIcon className="size-6" />,
        warning: <TriangleAlertIcon className="size-6" />,
        error: <OctagonXIcon className="size-6" />,
        loading: <Loader2Icon className="size-6 animate-spin" />,
      }}
      {...props}
    />
  );
};

export { Toaster };
