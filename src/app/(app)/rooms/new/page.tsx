import Link from "next/link";
import { getTimeZone } from "@/lib/tz";
import { toLocalInput } from "@/lib/time";
import { getMsg } from "@/i18n/server";
import { roomsMessages } from "@/i18n/rooms";
import { BackIcon, ShieldIcon } from "@/components/icons";
import { CreateRoomForm } from "@/components/rooms/CreateRoomForm";
import s from "@/components/rooms/Rooms.module.css";

export default async function NewRoomPage() {
  const m = await getMsg(roomsMessages);
  const tz = await getTimeZone();
  const next = new Date(Math.ceil((Date.now() + 30 * 60_000) / 3_600_000) * 3_600_000);
  return (
    <div className={`${s.scope} ${s.formPage}`}>
      <Link href="/rooms" className={s.back}>
        <BackIcon /> {m.back}
      </Link>
      <header className={s.pageHeader}>
        <h1>{m.newTitle}</h1>
        <p>{m.newLead}</p>
      </header>
      <div className={s.twoColumns}>
        <CreateRoomForm tz={tz} defaultStart={toLocalInput(next, tz)} minStart={toLocalInput(new Date(), tz)} />
        <aside className={s.guide}>
          <ShieldIcon className={s.guideIcon} />
          <h2>{m.moderator}</h2>
          <p>{m.fModerator}</p>
        </aside>
      </div>
    </div>
  );
}
