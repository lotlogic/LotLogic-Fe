import PrototypePage from "@/pages/PrototypePage";
import { EstateAccessGate } from "@/components/estate/EstateAccessGate";
import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

const parseEstateId = (
  estateIdFromPath: string | undefined,
  estateIdFromQuery: string | null
) => {
  const value = (estateIdFromPath ?? estateIdFromQuery ?? "").trim();
  return value.length > 0 ? value : null;
};

const EmbedPage = () => {
  const { estateId: estateIdFromPath } = useParams<{ estateId: string }>();
  const [searchParams] = useSearchParams();

  const estateId = useMemo(
    () => parseEstateId(estateIdFromPath, searchParams.get("estateId")),
    [estateIdFromPath, searchParams]
  );

  if (!estateId) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white px-6">
        <div className="max-w-lg text-center text-brand">
          <h1 className="text-2xl font-semibold">Missing estate id</h1>
          <p className="mt-2 text-brand-muted">
            Add an estate id to the URL, for example{" "}
            <span className="font-mono">/embed/my-estate-id</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <EstateAccessGate estateId={estateId}>
      <PrototypePage estateId={estateId} skipEstateAccessGate />
    </EstateAccessGate>
  );
};

export default EmbedPage;
