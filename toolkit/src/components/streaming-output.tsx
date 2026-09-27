import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function StreamingOutput({ text }: { text: string }) {
  return (
    <div data-testid="tool-output" className="prose prose-sm max-w-none">
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </div>
  );
}
