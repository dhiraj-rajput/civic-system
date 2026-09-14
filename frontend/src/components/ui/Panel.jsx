/* Case-file panel: flat surface, hairline border, small radius, and an
 * optional left accent bar instead of the generic rounded-2xl + soft-shadow
 * card used on every AI-generated dashboard. The accent tone carries
 * meaning (status/category), not decoration -- omit it for neutral panels. */
const ACCENTS = {
  none: "",
  steel: "border-l-4 border-l-steel",
  signal: "border-l-4 border-l-signal",
  brick: "border-l-4 border-l-brick",
  civic: "border-l-4 border-l-civic",
};

export default function Panel({ accent = "none", className = "", children, ...props }) {
  return (
    <div
      className={`rounded border border-line bg-surface ${ACCENTS[accent]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
