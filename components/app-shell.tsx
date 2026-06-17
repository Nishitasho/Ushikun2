"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Clock3,
  FileChartColumn,
  Rocket,
  Home,
  MapPinned,
  LogOut,
  MessageSquareMore,
  MessageSquareText,
  Plus,
  Settings,
  Sparkles
} from "lucide-react";
import { Button } from "./ui";
import { useKuroko } from "@/features/core/kuroko-store";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: Home },
  { href: "/launch", label: "運用開始", icon: Rocket },
  { href: "/stores", label: "店舗", icon: Building2 },
  { href: "/proposals", label: "AI提案", icon: MessageSquareText },
  { href: "/reviews", label: "口コミ", icon: MessageSquareMore },
  { href: "/rankings", label: "検索順位", icon: MapPinned },
  { href: "/reports", label: "レポート", icon: FileChartColumn },
  { href: "/history", label: "投稿履歴", icon: Clock3 },
  { href: "/settings", label: "設定", icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout, isReady, generateProposals } = useKuroko();

  useEffect(() => {
    if (isReady && !session) {
      router.replace("/login");
    }
  }, [isReady, router, session]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white/86 px-4 py-5 backdrop-blur lg:block">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-white">
            <Image
              src="/brand/ushikuns-ai-mascot.png"
              alt="牛くんずAI マスコット"
              width={46}
              height={56}
              className="h-12 w-auto object-contain object-top"
              priority
            />
          </span>
          <span>
            <span className="block text-lg font-black">牛くんずAI</span>
            <span className="text-xs font-semibold text-ink/52">店舗のAIマーケ担当</span>
          </span>
        </Link>

        <nav className="mt-8 grid gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                  active ? "bg-ink text-white" : "text-ink/70 hover:bg-paper hover:text-ink"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-4 right-4 grid gap-2">
          <Button
            className="w-full"
            onClick={() => {
              generateProposals();
              router.push("/proposals");
            }}
          >
            <Sparkles className="size-4" />
            本日の提案を作成
          </Button>
          <Button className="w-full" variant="secondary" onClick={() => router.push("/stores/new")}>
            <Plus className="size-4" />
            店舗を追加
          </Button>
          <button
            className="flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-semibold text-ink/55 hover:bg-paper hover:text-ink"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            <LogOut className="size-4" />
            ログアウト
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/88 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <span className="grid size-8 overflow-hidden rounded-md border border-line bg-white">
                <Image
                  src="/brand/ushikuns-ai-mascot.png"
                  alt=""
                  width={28}
                  height={34}
                  className="mx-auto h-8 w-auto object-contain object-top"
                />
              </span>
              <span className="font-black">牛くんずAI</span>
            </Link>
            <div className="hidden text-sm font-semibold text-ink/60 lg:block">
              毎朝の提案確認から承認・投稿履歴まで
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="hidden sm:inline-flex"
                onClick={() => {
                  generateProposals();
                  router.push("/proposals");
                }}
              >
                <Sparkles className="size-4" />
                提案作成
              </Button>
              <span className="rounded-full border border-line bg-white px-3 py-2 text-xs font-bold text-ink/65">
                {session?.email || "loading"}
              </span>
            </div>
          </div>
          <nav className="mt-3 grid grid-cols-3 gap-1 lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`grid min-h-12 place-items-center rounded-md text-[11px] font-bold ${
                    active ? "bg-ink text-white" : "bg-white/70 text-ink/62"
                  }`}
                >
                  <Icon className="mb-1 size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          <div className="demo-banner mb-5 rounded-md border border-brass/35 bg-brass/10 px-4 py-3 text-sm font-semibold text-[#765321]">
            現在はデモ版です。データはこのブラウザ内に保存され、Googleへの実投稿・実返信は行われません。
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
