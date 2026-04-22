import { buttonPrimary, input } from "@/lib/ui";

type ClientSearchFormProps = {
  defaultValue: string;
};

export function ClientSearchForm({ defaultValue }: ClientSearchFormProps) {
  return (
    <form
      method="get"
      className="clients-search-bar"
    >
      <input
        type="search"
        name="search"
        defaultValue={defaultValue}
        placeholder="Search by first or last name"
        className={input}
        style={{ minWidth: 0 }}
      />
      <button type="submit" className={buttonPrimary} style={{ width: "fit-content" }}>
        Search
      </button>
    </form>
  );
}
