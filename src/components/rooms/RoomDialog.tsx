"use client";

import { useEffect, useRef, type ReactNode } from "react";
import s from "./Rooms.module.css";

export function RoomDialog({ title, closeLabel, onClose, children, drawer = false }: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  drawer?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label={title}
      className={`${s.scope} ${s.dialog} ${drawer ? s.drawer : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={s.dialogBody}>
        <header className={s.dialogHeader}>
          <h2>{title}</h2>
          <button type="button" className={s.iconButton} aria-label={closeLabel} onClick={onClose}>×</button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
