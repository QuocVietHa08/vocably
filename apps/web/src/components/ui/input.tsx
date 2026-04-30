import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-lg border border-[#deded7] bg-[#fbfbf8] px-3 py-2 text-base font-semibold text-[#161616] outline-none transition placeholder:text-[#aaa9a1] focus:border-[#f4511e] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Input };
