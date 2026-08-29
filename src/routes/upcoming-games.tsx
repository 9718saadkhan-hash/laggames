import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/upcoming-games")({
  component: () => <div className="mx-auto max-w-7xl px-4 py-10">Coming soon</div>,
});
