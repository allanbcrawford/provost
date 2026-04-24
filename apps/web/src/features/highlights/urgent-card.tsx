"use client";

import Link from "next/link";

import { HighlightsCard } from "./highlights-card";
import { HighlightsIcon } from "./highlights-icon";

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      width="29"
      height="14"
      viewBox="0 0 29 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M17.5938 7.6606C15.6612 7.83408 13.6963 7.98187 11.7508 8.18748C9.73445 8.39309 7.71808 8.61155 5.70815 8.88142C4.97084 9.00178 4.247 9.19329 3.54683 9.45328C2.38082 9.85165 1.32432 9.69423 0.609247 8.92318C0.311509 8.63975 0.110355 8.27035 0.0340864 7.86694C-0.0421823 7.46353 0.0102721 7.04642 0.18407 6.6743C0.657562 5.58199 1.54657 5.11615 2.72225 5.11615C7.5538 5.11615 12.3854 5.11615 17.175 5.11615L11.4513 2.71627C11.2235 2.62513 11.0073 2.50759 10.8071 2.36609C10.5367 2.19931 10.3404 1.93579 10.2583 1.62942C10.1763 1.32306 10.2147 0.997011 10.3658 0.717978C10.4804 0.438924 10.6998 0.215577 10.9772 0.0955486C11.2546 -0.0244798 11.568 -0.0316951 11.8507 0.0754405C12.4949 0.281053 13.1004 0.644086 13.7543 0.830422C17.961 2.03197 22.187 3.21424 26.4162 4.41578C26.9831 4.57642 27.6209 4.66316 28.0815 4.98764C28.5421 5.31212 28.9737 5.85185 28.9995 6.32091C29.0188 6.73534 28.5066 7.2301 28.1362 7.60598C27.914 7.82766 27.5178 7.87585 27.1925 7.98187C22.9214 9.41151 18.8178 11.1624 15.0137 13.6233C14.8055 13.7756 14.5691 13.8851 14.3181 13.9456C14.0672 14.006 13.8067 14.0162 13.5517 13.9756C13.2968 13.935 13.0525 13.8443 12.8329 13.7088C12.6133 13.5734 12.4229 13.3958 12.2726 13.1864C12.1162 12.9715 12.0065 12.7264 11.9505 12.4668C11.8945 12.2071 11.8935 11.9387 11.9474 11.6787C12.0014 11.4186 12.1092 11.1726 12.2639 10.9565C12.4186 10.7404 12.6169 10.5588 12.846 10.4235C13.8348 9.78097 14.9139 9.28301 15.9639 8.74006C16.5115 8.45413 17.0816 8.21318 17.6421 7.94974L17.5938 7.6606Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function UrgentCard() {
  return (
    <HighlightsCard className="bg-provost-card-purple-light border border-provost-card-purple p-[18px]">
      <div className="flex h-full items-center gap-4">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            <HighlightsIcon className="text-provost-card-purple" />
            <span className="text-provost-card-purple text-[16px] font-semibold">Urgent</span>
          </div>
          <p className="text-provost-card-purple text-[20px] leading-[1.3] tracking-[-0.6px] font-serif">
            There is an upcoming quarterly family meeting that still requires an RSVP from you.
          </p>
        </div>

        <Link href="/events" className="hover:bg-secondary bg-card p-1 rounded-lg">
          <div className="flex items-center gap-2 px-5 py-2.5 border border-provost-card-purple rounded-lg text-provost-card-purple text-[20px] font-serif font-bold tracking-[-0.2px] transition-colors shrink-0">
            View Event
            <ArrowRightIcon />
          </div>
        </Link>
      </div>
    </HighlightsCard>
  );
}
