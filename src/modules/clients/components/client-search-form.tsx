import { buttonPrimary, input } from "@/lib/ui";

type ClientSearchFormProps = {
  defaultValue: string;
};

export function ClientSearchForm({ defaultValue }: ClientSearchFormProps) {
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
        placeholder="Search by first or last name"
        className={input}
        style={{
          minWidth: 280,
          flex: 1,
        }}
      />
      <button type="submit" className={buttonPrimary}>
        Search
      </button>
    </form>
  );
}
