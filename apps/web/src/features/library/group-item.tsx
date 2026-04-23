import { Button, Icon } from "@provost/ui";
import type { LibraryGroupSummary } from "./types";

export function GroupItem({ group }: { group: LibraryGroupSummary }) {
  return (
    <div className="flex items-center border-provost-border-default border-b py-3">
      <div className="flex h-[37px] w-[37px] flex-shrink-0 items-center justify-center">
        <Icon name="folder" size={23} weight={300} />
      </div>
      <div className="ml-3 flex-1">
        <p className="font-semibold text-[15px] tracking-[-0.45px]">{group.title}</p>
        <p className="mt-0.5 font-medium text-[10px] text-provost-neutral-500 tracking-[0.1px]">
          {group.source_count} sources
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <Button variant="outline" size="sm">
          View
        </Button>
      </div>
    </div>
  );
}
