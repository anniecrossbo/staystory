/** Mobile-width column for creator and traveler flows. */
export function Phone({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-[calc(100vh-57px)] w-full max-w-md bg-content1 sm:my-6 sm:min-h-0 sm:rounded-large sm:border sm:border-default-200">{children}</div>;
}
