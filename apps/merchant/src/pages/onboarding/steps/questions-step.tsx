// Step 3 — questions in the merchant's own language, never about "modules".
//
// The question list is not fixed: `questionsFor` drops anything the chosen
// type makes irrelevant. A cloud kitchen is never asked about tables, and a
// home kitchen is never asked about staff shifts — not because those
// questions are hidden, but because the SRS capability matrix says they do
// not apply to that segment.
import { Check } from "lucide-react";
import clsx from "clsx";
import { questionsFor, type Question, type TypeCode } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";

export type Answers = Record<string, string>;

export function QuestionsStep({
  type,
  answers,
  onAnswer,
}: {
  type: TypeCode;
  answers: Answers;
  onAnswer: (questionId: string, optionId: string) => void;
}) {
  const { t } = useI18n();
  const list = questionsFor(type);

  return (
    <div className="flex flex-col gap-3">
      {list.map((question, index) => (
        <QuestionCard
          key={question.id}
          index={index + 1}
          question={question}
          selected={answers[question.id]}
          onSelect={(optionId) => onAnswer(question.id, optionId)}
          t={t}
        />
      ))}
    </div>
  );
}

function QuestionCard({
  index,
  question,
  selected,
  onSelect,
  t,
}: {
  index: number;
  question: Question;
  selected: string | undefined;
  onSelect: (optionId: string) => void;
  t: (key: string) => string;
}) {
  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--octo-hover)] text-[10.5px] font-semibold text-[var(--octo-text-secondary)]">
          {index}
        </span>
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t(question.textKey)}</h3>
          {question.helpKey && (
            <p className="mt-0.5 text-[11.5px] text-[var(--octo-text-muted)]">{t(question.helpKey)}</p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.options.map((option) => {
          const active = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              aria-pressed={active}
              className={clsx(
                "flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-start text-[12.5px] transition-colors",
                active
                  ? "border-[#0D6EFD] bg-[var(--octo-selected)] font-medium text-[#0D6EFD]"
                  : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
              )}
            >
              {t(option.labelKey)}
              {active && (
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#0D6EFD] text-white">
                  <Check size={9} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
