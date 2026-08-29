// Ported verbatim from feedblick-edu/feedblick-stars — same operator, same business, so the
// same controller details apply here too. Shared between /impressum and /privacy so contact
// details can't drift out of sync between them.
export const CONTROLLER: {
  name: string | null;
  street: string | null;
  cityLine: string | null;
  email: string | null;
  taxId: string | null;
  vatId: string | null;
  wirtschaftsId: string | null;
} = {
  name: "Dr. Sergio Vargas - biodatum.io",
  street: "Nadistr. 06",
  cityLine: "Muenchen",
  email: "info@biodatum.io",
  taxId: "148/167/82687",
  vatId: "DE463981547",
  wirtschaftsId: "DE463981547-00001",
};
