import { redirect } from "next/navigation";

// Account creation now happens together with checkout on /subscribe, so old
// links to this page (bookmarks, saved WhatsApp/social links, etc.) still work
// by sending people straight to the combined signup + M-Pesa checkout page.
export default function SignupPage() {
  redirect("/subscribe");
}
