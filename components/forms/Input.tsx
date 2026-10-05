import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div>
      {label && <label className="label-field">{label}</label>}
      <input
        className={clsx(
          "input-field",
          error && "border-red-500 focus:border-red-500",
          className || ""
        )}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
