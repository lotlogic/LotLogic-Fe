import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { EstateRecord } from "./types";

type EstateTableProps = {
  estates: EstateRecord[];
  loading?: boolean;
  errorMessage?: string | null;
  onOpenEstate?: (estateId: string) => void;
  filterPlaceholder?: string;
  emptyMessage?: string;
  actionLabel?: string;
};

const getEstateName = (estate: EstateRecord): string =>
  typeof estate.name === "string" && estate.name.trim()
    ? estate.name
    : estate.id;

export const EstateTable = ({
  estates,
  loading = false,
  errorMessage = null,
  onOpenEstate,
  filterPlaceholder = "Filter estates by name or id",
  emptyMessage = "No estates match the current filter.",
  actionLabel = "Manage",
}: EstateTableProps) => {
  const [filterText, setFilterText] = useState("");

  const filteredEstates = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    if (!needle) {
      return estates;
    }
    return estates.filter((estate) => {
      const name = getEstateName(estate).toLowerCase();
      const id = estate.id.toLowerCase();
      return name.includes(needle) || id.includes(needle);
    });
  }, [estates, filterText]);

  const showActions = Boolean(onOpenEstate);
  const colSpan = showActions ? 4 : 3;

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
          Loading estates...
        </p>
      )}
      {errorMessage && <p className="text-destructive p-4">{errorMessage}</p>}
      {!loading && !errorMessage && (
        <div className="overflow-auto border rounded-lg">
          <table className="w-full border-collapse min-w-[520px]">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Estate
                </th>
                <th className="p-3 border-b font-medium text-sm text-slate-700">
                  Status
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
              {filteredEstates.map((estate) => (
                <tr key={estate.id}>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {getEstateName(estate)}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-sm">
                    {estate.status ?? "--"}
                  </td>
                  <td className="p-3 border-b border-slate-100 text-xs text-slate-400 font-mono">
                    {estate.id}
                  </td>
                  {showActions && (
                    <td className="p-3 border-b border-slate-100 text-sm">
                      <Button
                        onClick={() => onOpenEstate?.(estate.id)}
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        label={actionLabel}
                      />
                    </td>
                  )}
                </tr>
              ))}
              {!loading && filteredEstates.length === 0 && (
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

export default EstateTable;
