"use client";

import { useEffect } from "react";

// Параллакс и плавное появление блоков на лендинге для психологов.
// [data-parallax="0.15"] — слой едет медленнее или быстрее страницы (внутри неподвижного родителя).
// [data-reveal] — блок проявляется, когда доходит до экрана. Без скриптов и при «уменьшении движения» всё просто видно.
export function Parallax() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("js-reveal");
    const layers = [...document.querySelectorAll<HTMLElement>("[data-parallax]")];
    let frame = 0;
    const update = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      for (const el of layers) {
        const box = (el.parentElement ?? el).getBoundingClientRect();
        if (box.bottom < -200 || box.top > window.innerHeight + 200) continue;
        const shift = (box.top + box.height / 2 - mid) * Number(el.dataset.parallax);
        el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.shown = "";
            io.unobserve(e.target);
          }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      io.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);
  return null;
}
