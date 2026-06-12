export function csrfHeaders(headers: Record<string, string> = {}) {
  const token =
    typeof document === "undefined"
      ? ""
      : document.cookie
          .split("; ")
          .find((item) => item.startsWith("medipilot_csrf="))
          ?.split("=")[1] ?? "";

  return {
    ...headers,
    "X-CSRF-Token": decodeURIComponent(token)
  };
}
