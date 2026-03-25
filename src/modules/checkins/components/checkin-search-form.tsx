type CheckInSearchFormProps = {
  defaultValue: string;
};

export function CheckInSearchForm({ defaultValue }: CheckInSearchFormProps) {
  return (
    <form
      method="get"
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <input
        type="search"
        name="search"
        defaultValue={defaultValue}
        placeholder="Search client by name"
        style={{
          minWidth: 280,
          flex: 1,
          padding: "14px 16px",
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "#fff",
          font: "inherit",
        }}
      />
      <button
        type="submit"
        style={{
          border: 0,
          padding: "14px 18px",
          borderRadius: 14,
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Search
      </button>
    </form>
  );
}
