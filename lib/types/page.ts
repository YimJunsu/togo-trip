/** App Router 페이지 공통 props. params·searchParams는 Next 15부터 Promise다. */
export type PageProps<
  Params = Record<string, never>,
  Search = Record<string, string | string[] | undefined>,
> = {
  params: Promise<Params>
  searchParams: Promise<Search>
}
