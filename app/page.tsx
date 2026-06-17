import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Settings, Store } from "lucide-react";

const quickLinks = [
  {
    href: "/stores/new",
    title: "店舗を登録する",
    description: "Google Maps URL読み取りまたは手入力で、初期データを作成します。",
    icon: Store
  },
  {
    href: "/settings",
    title: "接続を確認する",
    description: "Supabase、Gemini、storesテーブルの本番接続を確認します。",
    icon: Settings
  }
];

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl content-center gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="max-w-2xl">
          <p className="text-sm font-bold text-brass">牛くんずAI</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-ink sm:text-5xl">
            店舗運用の初期設定をはじめましょう
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-ink/62">
            店舗情報を登録し、AI提案と接続状態を確認できる管理画面です。本番環境ではまず店舗登録と接続テストから進めます。
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/stores/new"
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-black"
            >
              店舗登録へ
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/settings"
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-white px-5 py-3 text-sm font-bold text-ink transition hover:bg-paper"
            >
              接続テストへ
            </Link>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg border border-line bg-white/84 p-4 shadow-soft transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-ink">
                    <Icon className="size-4 text-brass" />
                    {item.title}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-ink/58">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="flex justify-center lg:justify-end">
          <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-lg border border-line bg-white/72 shadow-soft">
            <Image
              src="/brand/ushikuns-ai-mascot.png"
              alt="牛くんずAI"
              fill
              priority
              sizes="(max-width: 1024px) 80vw, 380px"
              className="object-contain p-8"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
