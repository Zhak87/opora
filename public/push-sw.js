/* global self */

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const { title, body, href, tag } = event.data.json();
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag,
    icon: "/favicon.ico",
    data: { href },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = new URL(event.notification.data?.href || "/notifications", self.location.origin);
  if (href.origin !== self.location.origin) return;
  const login = new URL("/login", self.location.origin);
  login.searchParams.set("next", href.pathname + href.search);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((window) => window.url === href.href);
    if (existing) return existing.focus();
    return self.clients.openWindow(login.href);
  })());
});
