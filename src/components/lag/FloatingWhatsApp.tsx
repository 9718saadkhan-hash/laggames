import { useQuery } from "@tanstack/react-query";

import instagramAsset from "@/assets/instagram-button.png.asset.json";
import whatsappAsset from "@/assets/whatsapp-button.png.asset.json";
import { DEFAULT_CONTACT, HELP_MESSAGE, instagramUrl, whatsappLink } from "@/lib/lag";
import { contactFrom, settingsQuery } from "@/lib/queries";

/** Always-visible frosted WhatsApp help button (bottom right). */
export function FloatingWhatsApp() {
  const { data: settings } = useQuery(settingsQuery);
  const contact = settings ? contactFrom(settings) : DEFAULT_CONTACT;

  return (
    <div className="fixed right-3 bottom-24 z-40 flex flex-col gap-2 sm:right-5 sm:bottom-6">
      <a
        href={instagramUrl(contact.instagram)}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Follow LAG on Instagram"
        className="group relative grid h-13 w-13 place-items-center overflow-hidden rounded-2xl bg-transparent shadow-lg shadow-black/20 ring-1 ring-white/10 transition-transform duration-200 hover:scale-105 active:scale-95 md:h-14 md:w-14"
      >
        <img
          src={instagramAsset.url}
          alt=""
          className="h-full w-full object-cover"
          aria-hidden
        />
        <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
      </a>
      <a
        href={whatsappLink(contact.whatsapp, HELP_MESSAGE)}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Chat with LAG on WhatsApp"
        className="glass-btn glass-btn-whatsapp grid h-13 w-13 place-items-center overflow-hidden rounded-2xl p-0.5 md:h-14 md:w-14"
      >
        <span
          aria-hidden
          className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-[oklch(0.66_0.17_152_/_35%)] motion-reduce:animate-none"
        />
        <img src={whatsappAsset.url} alt="" className="h-full w-full object-contain" aria-hidden />
      </a>
    </div>
  );
}
