export const dynamic = "force-dynamic";

import Link from "next/link";
import { Gratitude } from "@/components/Gratitude";
import { StartForm } from "@/components/StartForm";
import {
  ArrowIcon,
  CompassIcon,
  HopeIcon,
  JournalIcon,
  LeafIcon,
  PenIcon,
  PlusIcon,
  SparkIcon,
  TalkIcon,
  TodayIcon,
} from "@/components/icons";
import { hope } from "@/i18n/hope";
import { getLocale } from "@/i18n/server";
import { hopePrompts, hopeQuestions, hopeThoughts, pickForDay, reflections } from "@/lib/content";
import styles from "./Hope.module.css";

const topicIcons = [TodayIcon, SparkIcon, HopeIcon, CompassIcon];

export default async function HopePage() {
  const locale = await getLocale();
  const m = hope[locale];
  const thought = pickForDay(hopeThoughts(locale));
  const question = pickForDay(hopeQuestions(locale), 2);

  return (
    <div className={styles.page} data-hope>
      <header className={styles.header}>
        <span className={styles.pageIcon} aria-hidden="true"><HopeIcon /></span>
        <div>
          <h1>{m.title}</h1>
          <p>{m.intro}</p>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="hope-thought">
        <div className={styles.heroContent}>
          <h2 id="hope-thought" className={styles.eyebrow}>
            <TodayIcon /> {m.thoughtToday}
          </h2>
          <blockquote>{thought.text}</blockquote>
          <p>{thought.note}</p>
          <div className={styles.heroActions}>
            <a className={styles.primary} href="#hope-practice">
              <PenIcon /> {m.startPractice}
            </a>
            <a className={styles.heroSecondary} href="#hope-talk">
              <TalkIcon /> {m.chooseTopic}
            </a>
          </div>
        </div>
      </section>

      <div className={styles.grid}>
        <section id="hope-talk" tabIndex={-1} className={styles.panel} aria-labelledby="hope-talk-title">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true"><TalkIcon /></span>
            <div>
              <h2 id="hope-talk-title">{m.talkImportant}</h2>
              <p>{m.talkImportantHint}</p>
            </div>
          </div>
          <div className={styles.topics}>
            {hopePrompts(locale).map((prompt, index) => {
              const Icon = topicIcons[index];
              return (
                <StartForm
                  key={prompt.title}
                  mode="hope"
                  title={prompt.title}
                  prompt={prompt.text}
                  pendingText={m.openingConversation}
                  className={styles.topic}
                >
                  <Icon />
                  <span>{prompt.title}</span>
                  <ArrowIcon className={styles.topicArrow} />
                </StartForm>
              );
            })}
          </div>
        </section>

        <section id="hope-practice" tabIndex={-1} className={`${styles.panel} ${styles.practice}`} aria-labelledby="hope-practice-title">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true"><LeafIcon /></span>
            <div>
              <h2 id="hope-practice-title">{m.threeGood}</h2>
              <p id="hope-practice-hint">{m.threeGoodHint}</p>
            </div>
          </div>
          <Gratitude describedBy="hope-practice-hint" />
        </section>

        <section className={styles.panel} aria-labelledby="hope-reflections">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon} aria-hidden="true"><JournalIcon /></span>
            <div>
              <h2 id="hope-reflections">{m.reflections}</h2>
              <p>{m.reflectionsHint}</p>
            </div>
          </div>
          <div className={styles.reflections}>
            {reflections(locale).map((reflection) => (
              <details key={reflection.title}>
                <summary>
                  {reflection.title}
                  <PlusIcon />
                </summary>
                <p>{reflection.body}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={`${styles.panel} ${styles.question}`} aria-labelledby="hope-question">
          <h2 id="hope-question" className={styles.eyebrow}><SparkIcon /> {m.questionTitle}</h2>
          <p>{question}</p>
          <div className={styles.questionActions}>
            <StartForm
              mode="hope"
              title={m.questionTitle}
              prompt={m.questionPrompt(question)}
              pendingText={m.openingConversation}
              className={styles.primary}
            >
              <TalkIcon /> {m.thinkTogether}
            </StartForm>
            <Link className={styles.textLink} href={{ pathname: "/journal", query: { q: question } }}>
              <PenIcon /> {m.answerInJournal}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
