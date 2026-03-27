import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Clock, CheckCircle, Send, ChevronLeft, ChevronRight } from "lucide-react";

interface ExamHeaderProps {
  examTitle: string;
  timeLimit: number;
  onSubmitExam: () => void;
  isSubmitted: boolean;
  endsAt?: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  onQuestionChange: (index: number) => void;
}

export const ExamHeader = ({ examTitle, timeLimit, onSubmitExam, isSubmitted, endsAt, currentQuestionIndex, totalQuestions, onQuestionChange }: ExamHeaderProps) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60);
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    if (endsAt) {
      const endTime = new Date(endsAt).getTime();
      const now = new Date().getTime();
      const secondsLeft = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(secondsLeft);
    }
  }, [endsAt]);

  useEffect(() => {
    if (isSubmitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimeUp(true);
          onSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted, onSubmitExam]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isUrgent = timeLeft <= 300;
  const isWarning = timeLeft <= 600 && !isUrgent;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-12 items-center justify-between px-4">
        {/* Left: Title */}
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-bold text-foreground truncate">{examTitle}</h1>
          {isSubmitted && (
            <Badge variant="outline" className="text-[10px] font-semibold text-emerald-500 border-emerald-500/20 bg-emerald-500/10 flex-shrink-0">
              <CheckCircle className="h-3 w-3 mr-1" />
              Submitted
            </Badge>
          )}
        </div>

        {/* Center: Question Navigation */}
        <div className="flex items-center gap-1">
          {!isSubmitted && totalQuestions > 1 && (
            <>
              <button
                onClick={() => onQuestionChange(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalQuestions }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => onQuestionChange(i)}
                    className={`w-7 h-7 rounded text-[11px] font-semibold transition-all ${i === currentQuestionIndex
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onQuestionChange(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === totalQuestions - 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Right: Timer + Submit */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums px-3 py-1 rounded-lg ${isUrgent
              ? 'text-red-500 bg-red-500/10 animate-pulse'
              : isWarning
                ? 'text-amber-500 bg-amber-500/10'
                : 'text-foreground bg-muted/50'
            }`}>
            <Clock className="h-3.5 w-3.5" />
            {formatTime(timeLeft)}
          </div>

          {!isSubmitted && !isTimeUp && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant={isUrgent ? "destructive" : "default"}
                  className="h-8 text-xs font-semibold gap-1.5 px-4"
                >
                  <Send className="h-3.5 w-3.5" />
                  Submit Test
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Test?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to submit? This action cannot be undone. You have <strong>{formatTime(timeLeft)}</strong> remaining.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onSubmitExam}>
                    Submit Test
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </header>
  );
};