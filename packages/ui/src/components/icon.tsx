import { cn } from "../utils/cn";

type Props = {
  name: string;
  size?: number | string;
  weight?: 200 | 300 | 400 | 500 | 600 | 700;
  filled?: boolean;
  className?: string;
};

export function Icon({ name, size = 20, weight = 400, filled = false, className }: Props) {
  return (
    <span
      className={cn("material-symbols-outlined inline-block select-none", className)}
      style={{
        fontSize: size,
        fontVariationSettings: `'wght' ${weight}, 'FILL' ${filled ? 1 : 0}`,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
