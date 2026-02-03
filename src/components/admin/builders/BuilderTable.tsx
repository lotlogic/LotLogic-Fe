import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { BuilderRecord } from "./types";

type BuilderTableProps = {
  builders: BuilderRecord[];
  loading?: boolean;
  errorMessage?: string | null;
  onOpenBuilder?: (builderId: string) => void;
  filterPlaceholder?: string;
  emptyMessage?: string;
  actionLabel?: string;
};

const getBuilderName = (builder: BuilderRecord): string =>
  typeof builder.name === "string" && builder.name.trim()
    ? builder.name
    : builder.id;

const getBuilderTeamCount = (builder: BuilderRecord): number =>
  builder.builderUsers?.length ?? 0;

export const BuilderTable = ({
  builders,
  loading = false,
  errorMessage = null,
  onOpenBuilder,
  filterPlaceholder = "Filter builders by name, email, phone, or id",
  emptyMessage = "No builders match the current filter.",
  actionLabel = "Manage Team",
}: BuilderTableProps) => {
  const [filterText, setFilterText] = useState("");

  const filteredBuilders = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    if (!needle) {
      return builders;
    }
    return builders.filter((builder) => {
      const name = getBuilderName(builder).toLowerCase();
      const email = (builder.email ?? "").toLowerCase();
      const phone = (builder.phone ?? "").toLowerCase();
      const id = builder.id.toLowerCase();
      return (
        name.includes(needle) ||
        email.includes(needle) ||
        phone.includes(needle) ||
        id.includes(needle)
      );
    });
  }, [builders, filterText]);

  const showActions = Boolean(onOpenBuilder);
  const colSpan = showActions ? 6 : 5;

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Input
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder={filterPlaceholder}
          className="flex-1 min-w-[220px]"
        />
      </div>

      {loading && (
        <p className="text-muted-foreground p-4 text-center">
          Loading builders...
        </p>
      )}
      {errorMessage && <p className="text-destructive p-4">{errorMessage}</p>}
      {!loading && !errorMessage && (
        <div className="overflow-auto border rounded-lg">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Builder
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Email
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Phone
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Team
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  ID
                </th>
                {showActions && (
                  <th className="p-3 border-b font-medium text-sm text-slate-700">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredBuilders.map((builder) => (
                <tr key={builder.id}>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {getBuilderName(builder)}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {builder.email ?? "--"}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {builder.phone ?? "--"}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {getBuilderTeamCount(builder)}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-xs text-slate-400 font-mono">
                    {builder.id}
                  </td>
                  {showActions && (
                    <td className="p-3 border-b border-slate-100 text-sm">
                      <Button
                        onClick={() => onOpenBuilder?.(builder.id)}
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        label={actionLabel}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {!loading && filteredBuilders.length === 0 && (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="p-4 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default BuilderTable;
