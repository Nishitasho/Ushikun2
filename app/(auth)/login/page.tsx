"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { useKuroko } from "@/features/core/kuroko-store";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useKuroko();
  const [email, setEmail] = useState("owner@ushikuns-ai.local");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login(email);
    router.replace("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-lg rounded-lg border border-line bg-white/90 p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-5">
          <span className="grid h-28 w-24 shrink-0 place-items-center overflow-hidden rounded-md bg-paper">
            <Image
              src="/brand/ushikuns-ai-mascot.png"
              alt="牛くんずAI マスコット"
              width={92}
              height={112}
              className="h-28 w-auto object-contain object-top"
              priority
            />
          </span>
          <div>
            <p className="text-xs font-bold text-brass">24時間365日、店舗運用をサポート</p>
            <h1 className="mt-1 text-3xl font-black text-ink">牛くんずAI</h1>
            <p className="mt-1 text-sm font-semibold text-ink/55">店舗マーケティング運用管理</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 grid gap-5">
          <Field label="メールアドレス">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Button type="submit" className="w-full">
            <LogIn className="size-4" />
            ログイン
          </Button>
        </form>

        <p className="mt-5 text-xs leading-5 text-ink/52">
          MVPではデモログインです。Supabase Authへ接続すると、同じ画面から本番認証に切り替えられます。
        </p>
      </div>
    </main>
  );
}
