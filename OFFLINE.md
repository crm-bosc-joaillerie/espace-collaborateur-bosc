# Mode hors ligne

Ouvrir l’application et les rubriques souhaitées une première fois avec une connexion, puis fermer et rouvrir le CRM pour activer le nouveau service worker. Le cache de l’application ne contient que des fichiers statiques. Les données et les modifications en attente sont chiffrées dans IndexedDB, séparées par compte ou appareil collaborateur.

L’accès hors ligne est limité à 24 heures depuis la dernière vérification en ligne. Le CRM principal conserve les fiches métier déjà consultées et les références Clients résolues sur un appareil autorisé. La création/modification des fiches Clients privées, les envois e-mail/SMS et l’administration nécessitent une connexion. Le CRM collaborateur permet la consultation des données chargées et la création/modification des pochettes hors ligne. Les autres actions collaborateur nécessitent une connexion.

Les changements ne partent qu’au retour de la connexion avec le CRM ouvert, ou à sa réouverture. Le statut en bas de l’écran signale les éléments en attente. Les conflits conservent la version locale : Voir permet de la consulter, de réessayer sans écraser ou de l’abandonner. La déconnexion est bloquée tant que des changements restent en attente.

Les mises à jour utilisent la version serveur updated_at. Le relais collaborateur utilise également un identifiant stable pour dédupliquer les reprises. La suppression d’une intervention conserve le lien planning/pochette ; elle ne supprime pas les autres interventions ni les documents commerciaux.

## Vérification

Compilation habituelle du projet. Test du moteur avec IndexedDB simulé et WebCrypto Node :

```sh
npm install --prefix /tmp/bosc-offline-tests fake-indexeddb@6.2.4 typescript@5.9.3 --ignore-scripts
OFFLINE_TEST_DEPS=/tmp/bosc-offline-tests node tests/offline-engine.mjs
```

Une validation sur iPhone réel reste nécessaire : ouverture connectée, activation par fermeture/réouverture, mode avion, modification de pochette, réouverture puis reconnexion. Aucun envoi client réel n’est nécessaire à cet essai.
