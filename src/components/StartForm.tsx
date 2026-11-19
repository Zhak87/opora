import { startConversation } from "@/lib/actions";
import { PendingButton } from "./SubmitButton";

// Форма-кнопка, которая начинает новый разговор (по теме, из «Надежды» или просто так).
export function StartForm({
  mode = "talk",
  topic,
  prompt,
  title,
  opener,
  pendingText,
  className = "",
  children,
}: {
  mode?: string;
  topic?: string;
  prompt?: string;
  title?: string;
  opener?: string;
  pendingText?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form action={startConversation} className="contents">
      <input type="hidden" name="mode" value={mode} />
      {topic && <input type="hidden" name="topic" value={topic} />}
      {prompt && <input type="hidden" name="prompt" value={prompt} />}
      {title && <input type="hidden" name="title" value={title} />}
      {opener && <input type="hidden" name="opener" value={opener} />}
      {pendingText ? (
        <PendingButton className={className} pendingText={pendingText}>{children}</PendingButton>
      ) : (
        <button type="submit" className={className}>{children}</button>
      )}
    </form>
  );
}
