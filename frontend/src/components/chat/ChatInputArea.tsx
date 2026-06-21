import { ArrowUpRight } from "@phosphor-icons/react";

type ChatInputAreaProps = {
  input: string;
  setInput: (val: string) => void;
  loading: boolean;
  onSend: (text: string, meta?: { source?: string; suggestionId?: string }) => void;
  onStop: () => void;
};

export function ChatInputArea({
  input,
  setInput,
  loading,
  onSend,
  onStop,
}: ChatInputAreaProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend(input, { source: "typed" });
      }}
      className="pt-2 shrink-0"
    >
      <div className="relative flex items-center glass-input rounded-full p-2 transition hover:shadow-[0_8px_30px_hsl(220_25%_12%/0.06)] focus-within:ring-2 focus-within:ring-foreground/10">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Cuéntale a Lumi sobre tu piel o qué buscas..."
          aria-label="Mensaje para Lumi"
          className="flex-1 bg-transparent border-none outline-none px-4 text-[14.5px] placeholder:text-muted-foreground/60"
        />
        {loading ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Detener generación"
            className="size-10 rounded-full bg-red-500/10 text-red-600 border border-red-500/15 flex items-center justify-center hover:bg-red-500/18 hover:shadow-[0_10px_26px_-18px_rgba(220,38,38,0.7)] active:scale-95 transition-all"
          >
            <div className="size-3.5 bg-current rounded-[0.35rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Enviar mensaje"
            className="size-10 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-transform"
          >
            <ArrowUpRight weight="light" className="size-5" />
          </button>
        )}
      </div>
    </form>
  );
}
