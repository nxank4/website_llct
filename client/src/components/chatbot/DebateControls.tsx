"use client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { MessageSquare } from "lucide-react";
import Spinner from "@/components/ui/Spinner";

interface DebateControlsProps {
  debateMode: "infinite" | "limited";
  debateTurnLimit: number;
  debateTopic: string;
  debateTopicTouched: boolean;
  debateHasStarted: boolean;
  isStartingDebate: boolean;
  debateLimitReached?: boolean;
  debateSummaryRequested?: boolean;
  debateSummaryComplete?: boolean;
  assistantDebateTurns?: number;
  activeDebateTopic?: string | null;
  onModeChange: (mode: "infinite" | "limited") => void;
  onTurnLimitChange: (limit: number) => void;
  onTopicChange: (topic: string) => void;
  onTopicBlur: () => void;
  onStartDebate: () => void;
  onRequestSummary?: () => void;
}

export default function DebateControls(props: DebateControlsProps) {
  const {
    debateMode,
    debateTurnLimit,
    debateTopic,
    debateTopicTouched,
    debateHasStarted,
    isStartingDebate,
    activeDebateTopic,
    onModeChange,
    onTurnLimitChange,
    onTopicChange,
    onTopicBlur,
    onStartDebate,
  } = props;

  const debateTopicError =
    debateTopicTouched && !debateTopic.trim()
      ? "Vui lòng nhập chủ đề debate trước khi bắt đầu."
      : null;

  return (
    <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Cài đặt Debate
        </span>
        <div className="inline-flex rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
          <Button
            type="button"
            variant={debateMode === "infinite" ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange("infinite")}
            className="px-4 py-1.5 rounded-none rounded-l-full"
          >
            Vô hạn
          </Button>
          <Button
            type="button"
            variant={debateMode === "limited" ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange("limited")}
            className="px-4 py-1.5 rounded-none rounded-r-full"
          >
            Giới hạn lượt
          </Button>
        </div>
      </div>

      {debateMode === "limited" && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Khi đạt giới hạn lượt phản biện, yêu cầu &quot;Tổng kết debate&quot;
          để AI đóng vai trọng tài và đánh giá chung.
        </p>
      )}

      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Lượt tối đa
        </label>
        <Input
          type="number"
          min="2"
          max="20"
          value={debateTurnLimit}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            if (!isNaN(value)) {
              const sanitized = Math.min(20, Math.max(2, value));
              onTurnLimitChange(sanitized);
            }
          }}
          disabled={debateHasStarted}
          className={`w-full ${
            debateHasStarted
              ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
          }`}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Chủ đề debate{" "}
          <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={debateTopic}
            onChange={(e) => onTopicChange(e.target.value)}
            onBlur={onTopicBlur}
            placeholder="Nhập chủ đề debate..."
            disabled={debateHasStarted}
            className={`flex-1 ${
              debateHasStarted
                ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
            }`}
          />
          <Button
            type="button"
            size="sm"
            onClick={onStartDebate}
            disabled={
              debateHasStarted || isStartingDebate || !debateTopic.trim()
            }
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[hsl(var(--secondary))] hover:bg-[#00a79f] shadow-md hover:shadow-lg"
          >
            {isStartingDebate ? (
              <>
                <Spinner size="sm" inline />
                <span>Đang bắt đầu...</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                <span>Bắt đầu debate</span>
              </>
            )}
          </Button>
        </div>
        {debateTopicError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {debateTopicError}
          </p>
        )}
        {activeDebateTopic && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[hsl(var(--secondary))]/10 dark:bg-[hsl(var(--secondary))]/20 text-[hsl(var(--secondary))] dark:text-[hsl(var(--secondary))] border border-[hsl(var(--secondary))]/30 dark:border-[hsl(var(--secondary))]/40">
            <span className="text-gray-600 dark:text-gray-300">
              Đang tranh luận:
            </span>
            <span className="text-gray-900 dark:text-white">
              &quot;{activeDebateTopic}&quot;
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
