import { getMsg } from "@/i18n/server";
import { roomsMessages } from "@/i18n/rooms";
import s from "@/components/rooms/Rooms.module.css";

export default async function Loading() {
  const m = await getMsg(roomsMessages);
  return (
    <div className={`${s.scope} ${s.catalogPage}`} aria-busy="true" aria-label={m.loading}>
      <div className={`${s.skeleton} ${s.skeletonHero}`} />
      <div className={s.twoColumns}>
        <div className={s.list}>
          <div className={`${s.skeleton} ${s.skeletonTabs}`} />
          {[0, 1, 2].map((item) => <div key={item} className={s.skeleton} />)}
        </div>
        <div className={`${s.skeleton} ${s.skeletonGuide}`} />
      </div>
    </div>
  );
}
