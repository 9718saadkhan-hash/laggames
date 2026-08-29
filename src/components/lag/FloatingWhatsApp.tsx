import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { DEFAULT_CONTACT, HELP_MESSAGE, whatsappLink } from "@/lib/lag";
import { contactFrom, settingsQuery } from "@/lib/queries";

/** Always-visible frosted WhatsApp help button (bottom right). */
export function FloatingWhatsApp() {
  const { data: settings } = useQuery(settingsQuery);
  const contact = settings ? contactFrom(settings) : DEFAULT_CONTACT;

  return (
    <a
      href={whatsappLink(contact.whatsapp, HELP_MESSAGE)}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with LAG on WhatsApp"
      className="glass-btn glass-btn-whatsapp fixed right-3 bottom-24 z-40 grid h-13 w-13 place-items-center rounded-full sm:right-5 sm:bottom-6 md:h-14 md:w-14"
    >
      <span
        aria-hidden
        className="absolute inset-0 -z-10 animate-ping rounded-full bg-[oklch(0.66_0.17_152_/_35%)] motion-reduce:animate-none"
      />
      <MessageCircle className="h-6 w-6" aria-hidden />
    </a>
  );
}
