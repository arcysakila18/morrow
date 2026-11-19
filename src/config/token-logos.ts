/**
 * Manual logo overrides. Use only official artwork from the project or company itself.
 *
 *  - LOGO_OVERRIDES: token address (lowercase) → image URL. Highest priority.
 *  - COMPANY_DOMAINS: Stock Token ticker → the company's official website, used when no
 *    ticker logo exists (e.g. private companies). The logo is then taken from that domain.
 */
export const LOGO_OVERRIDES: Record<string, string> = {};

export const COMPANY_DOMAINS: Record<string, string> = {
  SPCX: "spacex.com",
};
