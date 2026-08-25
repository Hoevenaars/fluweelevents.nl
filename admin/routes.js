export const ADMIN_HOSTNAME = "admin.fluweelevents.nl";
export const PUBLIC_ORIGIN = "https://fluweelevents.nl";

export const ADMIN_VIEWS = [
  "dashboard",
  "leads",
  "adresboek",
  "quotes",
  "invoices",
  "projects",
  "campaigns",
  "templates",
  "website",
  "integrations",
];

export function isAdminHostname(hostname) {
  return String(hostname || "").split(":")[0].toLowerCase() === ADMIN_HOSTNAME;
}

export function pathForView(view, hostname) {
  const id = ADMIN_VIEWS.includes(view) ? view : "dashboard";
  if (isAdminHostname(hostname)) return `/${id}`;
  return id === "dashboard" ? "/admin/" : `/admin/${id}`;
}

export function viewFromPath(pathname, hostname) {
  const parts = String(pathname || "/").split("/").filter(Boolean);
  if (isAdminHostname(hostname)) {
    const id = parts[0] || "dashboard";
    return ADMIN_VIEWS.includes(id) ? id : "dashboard";
  }
  if (parts[0] === "admin") {
    const id = parts[1] || "dashboard";
    return ADMIN_VIEWS.includes(id) ? id : "dashboard";
  }
  return "dashboard";
}
