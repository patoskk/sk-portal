// Único lugar donde vive el contacto de SK Optimal. Estaba duplicado como const
// en ConsultingCard y ReferralCard: cambiarlo obligaba a acordarse de los dos.
export const CONTACT_WHATSAPP = "5493816417933";

/** Link de WhatsApp con el mensaje ya escrito. */
export function waLink(text: string): string {
  return `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(text)}`;
}
