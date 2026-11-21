import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/helpers";
import { loginDestination } from "@/lib/auth/redirect";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
    redirect?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const next = loginDestination(params.next ?? params.redirect);
  if (await getSession()) redirect(next);
  return <LoginForm next={next} />;
}
