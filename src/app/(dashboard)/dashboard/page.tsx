import { redirect } from "next/navigation";

// "Ringkasan" and "Undangan" were confusingly similar — the invitation list
// is now the single home for managing invitations.
export default function DashboardPage() {
  redirect("/invitations");
}
