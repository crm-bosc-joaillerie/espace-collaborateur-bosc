# Mode hors ligne


## Extension du 17 octobre 2026

La file chiffrée persiste sur cet appareil. Test réseau réel `/network-check.json` toutes les 15 minutes, ainsi qu’au retour du réseau et au premier plan. La synchronisation traite toutes les demandes dans leur ordre de dépendance : fiches clients, écritures CRM, e-mails/confirmations SMS. Les erreurs réseau restent en attente ; un conflit ou un envoi incertain exige une vérification dans « Voir ».

CRM principal : créations/modifications de clients privés avec UUID stable et journal serveur anti-doublon ; devis/PDF et e-mails mis en attente ; confirmations SMS de rendez-vous existants mises en attente. CRM collaborateur : pochettes, messages, discussions et demandes de congés, avec contrôle des autorisations et de version côté serveur. Une session expirée conserve les travaux à synchroniser après reconnexion.

Les e-mails passent à envoyé après acceptation par le serveur. Les SMS sont ensuite transmis par le relais Mac : le Mac doit être disponible. Le composant externe Calendly et l’envoi manuel dans Messages restent dépendants de leur application ; une réservation externe ne peut pas être confirmée hors ligne. Administration, connexion et autorisation des appareils nécessitent le réseau.

Sur iPhone, iOS peut suspendre l’application fermée ou en arrière-plan : le contrôle reprend à la réouverture. Ouvrir d’abord les rubriques en ligne ; accès local validé 24 heures. Ne pas effacer les données du navigateur tant qu’il reste des opérations. Après mise à jour, fermer tous les onglets du CRM puis rouvrir en ligne.
