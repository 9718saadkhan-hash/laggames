import { queryOptions } from "@tanstack/react-query";
import { getMonthlyPsPlusRoster } from "./ps-plus-roster.functions";

export const monthlyPsPlusRosterQuery = queryOptions({
  queryKey: ["ps-plus", "monthly-roster"],
  queryFn: () => getMonthlyPsPlusRoster(),
  staleTime: 15 * 60_000,
  refetchInterval: 60 * 60_000,
});