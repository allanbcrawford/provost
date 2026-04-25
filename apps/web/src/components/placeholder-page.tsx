import { Icon } from "@provost/ui";

type Props = {
  title: string;
  description?: string;
  icon?: string;
};

export function PlaceholderPage({ title, description, icon = "construction" }: Props) {
  return (
    <div className="p-8">
      <h1 className="font-dm-serif font-medium text-[42px] text-provost-text-primary tracking-[-0.84px]">
        {title}
      </h1>
      <div className="mt-16 flex flex-col items-center justify-center text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-provost-bg-secondary">
          <Icon name={icon} size={32} weight={200} className="text-provost-text-secondary" />
        </div>
        <p className="mt-6 max-w-md font-light text-[16px] text-provost-text-secondary">
          {description ?? "This section is coming soon."}
        </p>
      </div>
    </div>
  );
}
