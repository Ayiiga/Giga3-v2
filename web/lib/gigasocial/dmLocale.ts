/**
 * GigaSocial DM UI strings (en / fr). Separate from AI response language.
 */

export type DmUiLocale = "en" | "fr";

const STORAGE_KEY = "giga3_gigasocial_dm_locale";

export type DmUiStrings = {
  sectionTitle: string;
  sectionDescription: string;
  messagesNav: string;
  inboxNav: string;
  emptyTitle: string;
  emptyDescription: string;
  loadingThreads: string;
  loadingMessages: string;
  errorTitle: string;
  errorRetry: string;
  offlineTitle: string;
  offlineSend: string;
  offlineRetry: string;
  composerPlaceholder: string;
  send: string;
  sending: string;
  sendFailed: string;
  newMessage: string;
  recipientLabel: string;
  recipientPlaceholder: string;
  startConversation: string;
  cancel: string;
  backToList: string;
  requestBanner: string;
  acceptRequest: string;
  declineAndBlock: string;
  declineConfirm: string;
  accepted: string;
  declinedBlocked: string;
  blockUser: string;
  blockConfirm: string;
  blockSuccess: string;
  blockHistoryNote: string;
  reportMessage: string;
  reportReasonLabel: string;
  reportReasonPlaceholder: string;
  reportSubmit: string;
  reportSuccess: string;
  reportCancel: string;
  unread: string;
  messageRequest: string;
  you: string;
  loadOlder: string;
  loadOlderRetry: string;
  loadOlderHint: string;
  endOfHistory: string;
  featureDisabledTitle: string;
  featureDisabledBody: string;
  serverDisabledTitle: string;
  serverDisabledBody: string;
  signInRequired: string;
  conversationMenu: string;
  close: string;
  previewEmpty: string;
  localeToggleEn: string;
  localeToggleFr: string;
};

const EN: DmUiStrings = {
  sectionTitle: "Messages",
  sectionDescription: "Direct messages stay separate from activity notifications.",
  messagesNav: "Messages",
  inboxNav: "Inbox",
  emptyTitle: "No conversations yet",
  emptyDescription: "When someone messages you, it will show up here.",
  loadingThreads: "Loading conversations…",
  loadingMessages: "Loading messages…",
  errorTitle: "Could not load messages",
  errorRetry: "Retry",
  offlineTitle: "You are offline",
  offlineSend: "Reconnect to send messages. Nothing is queued yet.",
  offlineRetry: "Retry when online",
  composerPlaceholder: "Write a message…",
  send: "Send",
  sending: "Sending…",
  sendFailed: "Message failed to send.",
  newMessage: "New message",
  recipientLabel: "Recipient email",
  recipientPlaceholder: "name@example.com",
  startConversation: "Start",
  cancel: "Cancel",
  backToList: "Back to conversations",
  requestBanner: "Message request — accept to continue chatting, or decline and block.",
  acceptRequest: "Accept",
  declineAndBlock: "Decline & block",
  declineConfirm:
    "Decline this request and block the sender? Soft decline is not available yet; this uses the block API.",
  accepted: "Request accepted.",
  declinedBlocked: "Request declined and user blocked.",
  blockUser: "Block",
  blockConfirm: "Block this person from messaging you?",
  blockSuccess: "User blocked. You can no longer send messages to each other.",
  blockHistoryNote:
    "Note: older messages may still appear until a server update hides blocked threads.",
  reportMessage: "Report",
  reportReasonLabel: "Reason",
  reportReasonPlaceholder: "Spam, harassment, other…",
  reportSubmit: "Submit report",
  reportSuccess: "Report submitted.",
  reportCancel: "Cancel report",
  unread: "Unread",
  messageRequest: "Request",
  you: "You",
  loadOlder: "Load older messages",
  loadOlderRetry: "Could not load older messages. Retry.",
  loadOlderHint: "An empty page does not mean the end of history.",
  endOfHistory: "No older messages.",
  featureDisabledTitle: "Messages are not enabled",
  featureDisabledBody:
    "Direct messaging UI is off in this build. Activity notifications remain in Inbox.",
  serverDisabledTitle: "Messaging unavailable",
  serverDisabledBody:
    "The server has direct messaging disabled. This is not a sign-in issue.",
  signInRequired: "Sign in to open messages",
  conversationMenu: "Conversation actions",
  close: "Close",
  previewEmpty: "No messages yet",
  localeToggleEn: "English",
  localeToggleFr: "Français",
};

const FR: DmUiStrings = {
  sectionTitle: "Messages",
  sectionDescription:
    "Les messages privés restent séparés des notifications d’activité.",
  messagesNav: "Messages",
  inboxNav: "Boîte de réception",
  emptyTitle: "Aucune conversation",
  emptyDescription: "Lorsqu’on vous écrit, la conversation apparaîtra ici.",
  loadingThreads: "Chargement des conversations…",
  loadingMessages: "Chargement des messages…",
  errorTitle: "Impossible de charger les messages",
  errorRetry: "Réessayer",
  offlineTitle: "Vous êtes hors ligne",
  offlineSend: "Reconnectez-vous pour envoyer. Rien n’est mis en file pour l’instant.",
  offlineRetry: "Réessayer une fois en ligne",
  composerPlaceholder: "Écrire un message…",
  send: "Envoyer",
  sending: "Envoi…",
  sendFailed: "Échec de l’envoi.",
  newMessage: "Nouveau message",
  recipientLabel: "E-mail du destinataire",
  recipientPlaceholder: "nom@exemple.com",
  startConversation: "Démarrer",
  cancel: "Annuler",
  backToList: "Retour aux conversations",
  requestBanner:
    "Demande de message — acceptez pour continuer, ou refusez et bloquez.",
  acceptRequest: "Accepter",
  declineAndBlock: "Refuser et bloquer",
  declineConfirm:
    "Refuser cette demande et bloquer l’expéditeur ? Le refus soft n’existe pas encore ; ceci utilise l’API de blocage.",
  accepted: "Demande acceptée.",
  declinedBlocked: "Demande refusée et utilisateur bloqué.",
  blockUser: "Bloquer",
  blockConfirm: "Bloquer cette personne pour la messagerie ?",
  blockSuccess: "Utilisateur bloqué. Vous ne pouvez plus vous écrire.",
  blockHistoryNote:
    "Remarque : d’anciens messages peuvent encore s’afficher jusqu’à une mise à jour serveur.",
  reportMessage: "Signaler",
  reportReasonLabel: "Motif",
  reportReasonPlaceholder: "Spam, harcèlement, autre…",
  reportSubmit: "Envoyer le signalement",
  reportSuccess: "Signalement envoyé.",
  reportCancel: "Annuler le signalement",
  unread: "Non lu",
  messageRequest: "Demande",
  you: "Vous",
  loadOlder: "Charger les messages plus anciens",
  loadOlderRetry: "Impossible de charger. Réessayer.",
  loadOlderHint: "Une page vide ne signifie pas la fin de l’historique.",
  endOfHistory: "Pas de messages plus anciens.",
  featureDisabledTitle: "Messages désactivés",
  featureDisabledBody:
    "L’interface de messagerie est désactivée dans cette version. Les notifications restent dans la Boîte de réception.",
  serverDisabledTitle: "Messagerie indisponible",
  serverDisabledBody:
    "Le serveur a désactivé la messagerie directe. Ce n’est pas un problème de connexion.",
  signInRequired: "Connectez-vous pour ouvrir les messages",
  conversationMenu: "Actions de la conversation",
  close: "Fermer",
  previewEmpty: "Aucun message",
  localeToggleEn: "English",
  localeToggleFr: "Français",
};

export function readDmUiLocale(): DmUiLocale {
  if (typeof window === "undefined") return "en";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "fr" || raw === "en") return raw;
    const nav = navigator.language?.toLowerCase() ?? "";
    if (nav.startsWith("fr")) return "fr";
  } catch {
    /* ignore */
  }
  return "en";
}

export function writeDmUiLocale(locale: DmUiLocale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function dmUiStrings(locale: DmUiLocale): DmUiStrings {
  return locale === "fr" ? FR : EN;
}
