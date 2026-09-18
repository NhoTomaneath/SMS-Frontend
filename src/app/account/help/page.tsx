"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SearchIcon, LightbulbIcon, ChevronRightIcon } from "@/components/icons";
import { useApiQuery } from "@/lib/api/hooks";
import type { HelpArticleDTO, HelpArticleSummaryDTO } from "@/lib/api/types";

export default function HelpCenterPage() {
  const [search, setSearch] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const listQuery = useApiQuery<HelpArticleSummaryDTO[]>(
    ["account", "help", "articles"],
    "/help/articles",
  );

  const filtered = useMemo(() => {
    const articles = listQuery.data?.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return articles;
    return articles.filter(
      (a) => a.title.toLowerCase().includes(term) || a.category.toLowerCase().includes(term),
    );
  }, [listQuery.data, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, HelpArticleSummaryDTO[]>();
    for (const a of filtered) {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const articleQuery = useApiQuery<HelpArticleDTO>(
    ["account", "help", "article", activeSlug],
    `/help/articles/${activeSlug}`,
    { enabled: Boolean(activeSlug) },
  );

  return (
    <div>
      <PageHeader title="Help Center" description="Browse guides and answers to common questions." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="relative mb-4">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="w-full rounded-full border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-700 outline-none focus:border-rose-400"
            />
          </div>

          <div className="space-y-5">
            {listQuery.isLoading && <p className="text-sm text-stone-400">Loading…</p>}
            {listQuery.isError && (
              <p className="text-sm text-rose-600">Couldn&apos;t load help articles.</p>
            )}
            {grouped.map(([category, items]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">
                  {category}
                </p>
                <div className="space-y-1">
                  {items.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setActiveSlug(a.slug)}
                      className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                        activeSlug === a.slug
                          ? "bg-rose-800 text-white"
                          : "text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      {a.title}
                      <ChevronRightIcon className="h-4 w-4 shrink-0 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!listQuery.isLoading && !listQuery.isError && filtered.length === 0 && (
              <p className="text-sm text-stone-400">No articles match your search.</p>
            )}
          </div>
        </div>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 lg:col-span-2">
          {!activeSlug && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <LightbulbIcon className="h-8 w-8 text-stone-300" />
              <p className="text-sm text-stone-400">Select an article to read it here.</p>
            </div>
          )}
          {activeSlug && articleQuery.isLoading && (
            <p className="text-sm text-stone-400">Loading…</p>
          )}
          {activeSlug && articleQuery.isError && (
            <p className="text-sm text-rose-600">Couldn&apos;t load this article.</p>
          )}
          {activeSlug && articleQuery.data?.data && (
            <article>
              <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
                {articleQuery.data.data.category}
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-stone-900">
                {articleQuery.data.data.title}
              </h2>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                {articleQuery.data.data.body}
              </div>
            </article>
          )}
        </section>
      </div>
    </div>
  );
}
