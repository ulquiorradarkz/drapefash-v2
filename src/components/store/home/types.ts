import type { PickSnapshot } from "@/lib/pick-item";

/** A piece as the home page sections need it: localized, priced and linked on the server, plain data for the client. */
export type HomePiece = {
  id: string;
  slug: string;
  href: string;
  image: string | null;
  title: string;
  code: string | null;
  /** The store's display name (AliExpress, SHEIN, Bulchic) or the translated word for another store. */
  store: string;
  category: string | null;
  categorySlug: string | null;
  /** Formatted price, or null when the store shows it. */
  price: string | null;
  pick: PickSnapshot;
};
