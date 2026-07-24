import { lazy, Suspense, type FC } from 'react'
import type { Components } from 'react-markdown'

// react-markdown важить непропорційно багато для базового форматування тексту
// (заголовки/жирний/списки/лінки), тож вантажимо його лениво окремим чанком —
// не роздуває головний бандл (ціль Lighthouse 90+).
const ReactMarkdown = lazy(() => import('react-markdown'))

interface MarkdownProps {
  /** Сирий Markdown-текст для рендеру. */
  source: string
  /** Клас обгортки; перевизначає відступи між блоками за замовчуванням. */
  className?: string
}

// Мапінг тегів на дизайн-токени апки (узгоджено з попереднім рендером тіла TermsPage).
const components: Components = {
  p: ({ children }) => <p className="text-[15px] text-text-secondary">{children}</p>,
  h1: ({ children }) => (
    <h1 className="mt-2 text-lg font-bold text-text-primary first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-2 text-base font-bold text-text-primary first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2 text-[15px] font-bold text-text-primary first:mt-0">{children}</h3>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-5 text-[15px] text-text-secondary">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5 text-[15px] text-text-secondary">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-bold text-text-primary">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border-dashed pl-4 text-text-secondary">
      {children}
    </blockquote>
  ),
}

/**
 * Рендер базового Markdown (заголовки, жирний/курсив, списки, лінки, цитата —
 * без GFM/таблиць) дизайн-токенами апки. `skipHtml` вимикає виконання сирого
 * HTML у контенті. Лінки завжди відкриваються зовні (target=_blank), що
 * коректно для Telegram Mini App.
 */
export const Markdown: FC<MarkdownProps> = ({ source, className }) => (
  <div className={className ?? 'space-y-4'}>
    <Suspense fallback={null}>
      <ReactMarkdown skipHtml components={components}>
        {source}
      </ReactMarkdown>
    </Suspense>
  </div>
)
