export default function StatusBadge({ status, type }) {
  const s = (status || "").toLowerCase().replace(/ /g, "_");
  return <span className={`badge badge-${s}`}>{(status || "").replace(/_/g, " ")}</span>;
}
