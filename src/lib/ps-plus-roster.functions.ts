import { createServerFn } from "@tanstack/react-start";

/** Public, fixed-source Sony announcements only; never reads account or catalogue data. */
export const getMonthlyPsPlusRoster = createServerFn({ method: "GET" }).handler(async () => {
  const { readMonthlyRoster } = await import("./ps-plus-roster.server");
  return readMonthlyRoster();
});