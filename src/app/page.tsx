import { redirect } from "next/navigation";

// The organiser's home is the Events list; it sends signed-out people to sign-in and new ones to set-up.
export default function Home() {
  redirect("/events");
}
