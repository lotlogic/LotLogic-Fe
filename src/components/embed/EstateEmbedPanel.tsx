import { cn } from "@/lib/utils";
import {
  buildEstateEmbedIframeCode,
  buildEstateEmbedScriptCode,
  buildEstateEmbedUrl,
} from "@/lib/embed/estateEmbed";
import { useMemo } from "react";

type EstateEmbedPanelProps = {
  estateId: string;
  themeGuid?: string | null;
  className?: string;
};

export const EstateEmbedPanel = ({
  estateId,
  themeGuid,
  className,
}: EstateEmbedPanelProps) => {
  const previewUrl = useMemo(
    () => buildEstateEmbedUrl({ estateId, themeGuid, absolute: true }),
    [estateId, themeGuid]
  );
  const iframeCode = useMemo(
    () => buildEstateEmbedIframeCode({ estateId, themeGuid }),
    [estateId, themeGuid]
  );
  const scriptCode = useMemo(
    () => buildEstateEmbedScriptCode({ estateId, themeGuid }),
    [estateId, themeGuid]
  );
  const hasThemeGuid = Boolean(themeGuid?.trim());

  return (
    <div
      className={cn(
        "rounded-md border border-slate-200 bg-slate-50 p-4",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Embed preview</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Open the hosted estate embed in a new window, then expand the code
            examples for iframe or `lotlogic-embed.js` setup.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {hasThemeGuid
              ? `Theme GUID: ${themeGuid}`
              : "No explicit theme GUID is attached to this preview link."}
          </p>
        </div>
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center justify-center rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-100"
        >
          Open embed page
        </a>
      </div>

      <div className="mt-3 rounded border border-slate-200 bg-white p-3">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Preview URL
        </div>
        <div className="mt-1 break-all font-mono text-xs text-slate-700">
          {previewUrl}
        </div>
      </div>

      <details className="mt-3 rounded border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-900">
          Show embed examples
        </summary>

        <div className="mt-4 grid gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Example iframe
            </p>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs leading-5 text-slate-100">
              <code>{iframeCode}</code>
            </pre>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Example JavaScript embed
            </p>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs leading-5 text-slate-100">
              <code>{scriptCode}</code>
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
};

export default EstateEmbedPanel;
