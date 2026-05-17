'use client';

interface PipelineLogProps {
  logs: string[];
  currentStep?: string;
}

export function PipelineLog({ logs, currentStep }: PipelineLogProps) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-3">
      {currentStep && (
        <div className="mb-2 flex items-center gap-2 border-b border-zinc-700 pb-2">
          <div className="size-2 animate-pulse rounded-full bg-green-400" />
          <p className="text-[11px] font-bold text-green-400">{currentStep}</p>
        </div>
      )}
      <div className="h-28 overflow-y-auto">
        {logs.map((log, i) => (
          <p key={i} className="font-mono text-[10px] leading-5 text-zinc-400">
            {log}
          </p>
        ))}
        {logs.length === 0 && (
          <p className="font-mono text-[10px] text-zinc-600">
            {'파이프라인 대기중...'}
          </p>
        )}
      </div>
    </div>
  );
}
