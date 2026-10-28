import { OPERATOR_MISSING_TEXT, missingOperatorFields, siteConfig } from "@/lib/site-config";

/** Operator identity from site-config; a visible gap notice while values are missing (§5.7). */
export function OperatorLine({ className }: { className?: string }) {
  if (missingOperatorFields().length > 0) {
    return (
      <p data-testid="operator-missing" className={className}>
        {OPERATOR_MISSING_TEXT}
      </p>
    );
  }
  return (
    <p data-testid="operator" className={className}>
      {siteConfig.operatorName}, IČO {siteConfig.operatorId}, {siteConfig.operatorAddress},{" "}
      <a href={`mailto:${siteConfig.contactEmail}`} className="link">
        {siteConfig.contactEmail}
      </a>
    </p>
  );
}
