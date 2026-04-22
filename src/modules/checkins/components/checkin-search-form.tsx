import { buttonPrimary, input } from "@/lib/ui";

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
