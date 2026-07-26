export const NAIRA = "₦";
export function formatNaira(kobo: number): string {
  return NAIRA + (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export const CRF_CONTACT = {
  phone1: "07034391471",
  phone2: "+2347048401355",
  email: "info@crfacademy.ng",
  brand: "CRF Online Academy",
  fullName: "Craddle Reading Foundation (CRF) Online Academy",
};

export const CATEGORY_LABEL: Record<string, string> = {
  kindergarten: "Kindergarten",
  primary: "Primary School",
  summer: "Summer Program",
};
