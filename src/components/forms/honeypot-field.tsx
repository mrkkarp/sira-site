import { forwardRef } from "react";
import { HONEYPOT_FIELD } from "@/lib/forms/honeypot";

/**
 * Anti-spam honeypot input (Prompt 8 §8), shared by every public lead/
 * subscription form. Real visitors never see or fill it — hidden from
 * sighted users (off-screen), from screen readers (`aria-hidden`), and
 * from keyboard tab order (`tabIndex={-1}`). Any submission where it's
 * non-empty is treated as a bot server-side (`isHoneypotTripped`) and
 * gets a fake "success" response, never a rejection.
 */
export const HoneypotField = forwardRef<HTMLInputElement>(
  function HoneypotField(_props, ref) {
    return (
      <input
        ref={ref}
        type="text"
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="pointer-events-none absolute top-auto left-[-9999px] h-px w-px overflow-hidden"
      />
    );
  },
);
