# Optimisations du 6 novembre 2026

- Un lot reçu (huit modules et autorisation hors ligne) est enregistré en une seule écriture chiffrée.
- Les lectures et affichages du statut ne réécrivent plus le coffre.
- Les appels simultanés partagent une requête par session ; le contrôle visible passe de 20 à 60 secondes. Le retour à la page et les notifications conservent leurs déclenchements.
- Le serveur vérifie la session, relit les données et applique les droits avant de calculer une empreinte de la vue autorisée. Si elle est identique, il renvoie seulement unchanged et revision. Les anciens clients continuent de recevoir les données complètes.
- L'empreinte inclut les libellés clients et le contenu, sans dépendre de updated_at : les écritures existantes ne mettent pas toutes ce champ à jour. Il n'y a donc pas de cache durable des lignes serveur.
- Les modifications en attente restent prioritaires et la révision locale est invalidée à l'enregistrement et à la synchronisation d'une modification. Les photos restent disponibles hors ligne.
- Le gateway est basé sur la version 16 effectivement déployée, y compris les notes partagées, les notes du CRM principal et les contrôles de concurrence déjà en production.

Validation : npm run build (incluant tests/snapshot-sync.mjs), tests/offline-engine.mjs avec TypeScript/fake-indexeddb. Vérifications : suppression, réaffectation, changement sans horodatage, changement de libellé, révocation, pagination au-delà de 500, photos hors ligne, expiration, session changée, zéro écriture lors d'un contrôle inchangé (hors renouvellement périodique d'accès).

Le contrôle TypeScript du frontend conserve 19 diagnostics préexistants dans app/page.tsx, vérifiés sur la version de base et la version modifiée. Aucun nouveau diagnostic frontend observé. Les erreurs existantes ne sont pas corrigées par cette livraison.

Limites : le premier chargement et tout lot modifié contiennent toujours les photos ; le serveur relit les modules complets dans la base. Aucun gain de temps réel sur les Mac n'a été mesuré. Aucun changement des règles SMS ni des politiques de base de données dans cette livraison.

