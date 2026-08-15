import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, CheckCircle2, AlertTriangle, Gift, MessageSquare, MessagesSquare } from "lucide-react";
import { Badge, Button, EmptyState, Textarea } from "@ui/primitives";
import {
  feedbackRows,
  type FeedbackChannel,
  type FeedbackCategory,
  type FeedbackStatus,
} from "@/shared/api/mock-customers";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_TONE: Record<FeedbackStatus, "success" | "error" | "warning" | "info" | "neutral"> = {
  New: "info",
  "In Progress": "warning",
  Resolved: "success",
  Escalated: "error",
};

const STATUS_KEY: Record<FeedbackStatus, string> = {
  New: "customers.feedback.status.new",
  "In Progress": "customers.feedback.status.inProgress",
  Resolved: "customers.feedback.status.resolved",
  Escalated: "customers.feedback.status.escalated",
};

const CHANNEL_KEY: Record<FeedbackChannel, string> = {
  "In-app": "customers.feedback.channel.inApp",
  WhatsApp: "customers.feedback.channel.whatsapp",
  Google: "customers.feedback.channel.google",
  Aggregator: "customers.feedback.channel.aggregator",
};

const CATEGORY_KEY: Record<FeedbackCategory, string> = {
  "Food Quality": "customers.feedback.category.foodQuality",
  Service: "customers.feedback.category.service",
  "Delivery Time": "customers.feedback.category.deliveryTime",
  "Wrong Order": "customers.feedback.category.wrongOrder",
  Cleanliness: "customers.feedback.category.cleanliness",
  Pricing: "customers.feedback.category.pricing",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={14} className={i < rating ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[var(--octo-text-faint)]"} />
      ))}
    </span>
  );
}

export function CustomerFeedbackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const feedback = feedbackRows.find((f) => f.id === id);
  const [reply, setReply] = useState("");
  const [actionNote, setActionNote] = useState<string | null>(null);

  const back = (
    <Button
      variant="ghost"
      size="sm"
      icon={<ArrowLeft size={13} className="rtl:rotate-180" />}
      onClick={() => navigate("/customers/feedback")}
    >
      {t("customers.feedback.detail.back")}
    </Button>
  );

  if (!feedback) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
        {back}
        <EmptyState
          className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]"
          icon={<MessagesSquare size={18} />}
          title={t("customers.feedback.detail.notFound")}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      {back}

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div>
          <h1 className="text-[17px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[19px]">{feedback.customer}</h1>
          <p className="mt-0.5 text-[12px] text-[var(--octo-text-muted)]">
            {feedback.branch} · {feedback.date} · {t(CHANNEL_KEY[feedback.channel])}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Stars rating={feedback.rating} />
            <Badge tone={STATUS_TONE[feedback.status]}>{t(STATUS_KEY[feedback.status])}</Badge>
            <span className="text-[11px] text-[var(--octo-text-muted)]">{t(CATEGORY_KEY[feedback.category])}</span>
          </div>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <p className="rounded-[9px] bg-[var(--octo-hover)] px-3 py-2.5 text-[12.5px] text-[var(--octo-text-primary)]">{feedback.comment}</p>

          <div className="mt-3 flex items-center justify-between text-[11.5px] text-[var(--octo-text-muted)]">
            <span>{t("customers.feedback.drawer.relatedOrder")}</span>
            <span className="font-medium text-[var(--octo-text-primary)]">{feedback.orderId}</span>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11.5px] text-[var(--octo-text-muted)]">
            <span>{t("customers.feedback.col.assignedTo")}</span>
            <span className="font-medium text-[var(--octo-text-primary)]">{feedback.assignedTo}</span>
          </div>

          <div className="mt-5">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("customers.feedback.drawer.internalNotes")}
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {feedback.internalNotes.map((note, i) => (
                <li key={i} className="rounded-[9px] border border-[var(--octo-divider)] px-2.5 py-2">
                  <div className="flex items-center justify-between text-[11px] text-[var(--octo-text-muted)]">
                    <span className="font-medium text-[var(--octo-text-primary)]">{note.author}</span>
                    <span>{note.time}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-[var(--octo-text-secondary)]">{note.note}</p>
                </li>
              ))}
              {feedback.internalNotes.length === 0 && (
                <li className="text-[12px] text-[var(--octo-text-muted)]">{t("customers.feedback.drawer.noNotes")}</li>
              )}
            </ul>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("customers.feedback.drawer.reply")}
            </h2>
            <Textarea
              className="mt-2"
              rows={4}
              placeholder={t("customers.feedback.drawer.replyPlaceholder")}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
            />
            <Button
              className="mt-2 w-full"
              icon={<MessageSquare size={13} />}
              disabled={!reply.trim()}
              onClick={() => setActionNote(t("customers.feedback.drawer.replySent"))}
            >
              {t("customers.feedback.drawer.sendReply")}
            </Button>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
            <Button
              size="sm"
              icon={<CheckCircle2 size={13} />}
              onClick={() => setActionNote(t("customers.feedback.drawer.resolvedConfirm"))}
            >
              {t("customers.feedback.drawer.resolve")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<AlertTriangle size={13} />}
              onClick={() => setActionNote(t("customers.feedback.drawer.escalatedConfirm"))}
            >
              {t("customers.feedback.drawer.escalate")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Gift size={13} />}
              onClick={() => setActionNote(t("customers.feedback.drawer.compensationConfirm"))}
            >
              {t("customers.feedback.drawer.offerCompensation")}
            </Button>
          </div>

          {actionNote && (
            <div className="rounded-[9px] bg-[#22C55E]/10 px-3 py-2 text-center text-[11.5px] font-medium text-[#16a34a]">
              {actionNote}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
