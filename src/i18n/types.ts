/** Plural forms keyed by Intl.PluralRules categories. `other` is always required. */
export type Plural = {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

/**
 * A legal or about page. Paragraph and list strings support a tiny inline syntax:
 * [label](/path) for links (localized automatically), **bold**, `code`, and {email}.
 */
export type LegalDoc = {
  title: string;
  lead: string;
  /** Each section: heading, paragraphs, an optional list, then optional paragraphs after the list. */
  sections: { h: string; p?: string[]; list?: string[]; after?: string[] }[];
};

export const plural = (forms: Plural) => forms;
export const legal = (doc: LegalDoc) => doc;
