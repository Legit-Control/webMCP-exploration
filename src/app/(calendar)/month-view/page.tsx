import { ClientContainer } from "@/calendar/components/client-container";

export const dynamic = "force-dynamic";

export default function Page() {
  return <ClientContainer view="month" />;
}
