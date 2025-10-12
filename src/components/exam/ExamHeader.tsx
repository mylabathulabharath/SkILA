import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Clock, CheckCircle } from "lucide-react";

interface ExamHeaderProps {
  examTitle: string;
  timeLimit: number; // in minutes
  onSubmitExam: () => void;
  isSubmitted: boolean;
  endsAt?: string; // ISO string for when the exam ends
  currentQuestionIndex: number;
  totalQuestions: number;
  onQuestionChange: (index: number) => void;
}

export const ExamHeader = ({ examTitle, timeLimit, onSubmitExam, isSubmitted, endsAt, currentQuestionIndex, totalQuestions, onQuestionChange }: ExamHeaderProps) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60); // Convert to seconds
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    // Calculate time left based on endsAt if provided
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
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 300) return "text-destructive"; // Last 5 minutes
    if (timeLeft <= 600) return "text-yellow-600"; // Last 10 minutes
    return "text-foreground";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">{examTitle}</h1>
          {isSubmitted && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary" />
              Submitted
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Question Navigation */}
          {!isSubmitted && totalQuestions > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Question:</span>
              <div className="flex gap-1">
                {Array.from({ length: totalQuestions }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => onQuestionChange(i)}
                    className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                      i === currentQuestionIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className={`flex items-center gap-2 font-mono text-lg font-semibold ${getTimerColor()}`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
          
          {!isSubmitted && !isTimeUp && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant={timeLeft <= 300 ? "destructive" : "default"}
                  className="font-medium"
                >
                  Submit Test
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Test</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to submit your test? This action cannot be undone and you won't be able to make any further changes.
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