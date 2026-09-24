const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

export function LinkifiedText({ text }: { text: string }) {
  return <>{text.split(URL_PATTERN).map((part, index) => /^https?:\/\//.test(part) ? (
    <a key={`${part}-${index}`} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">{part}</a>
  ) : part)}</>;
}
