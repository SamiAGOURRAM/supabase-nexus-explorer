# Nettoyage du système d'inscriptions (Registrations)

## Date
4 Novembre 2025

## Contexte
Le système a été converti d'un flux basé sur les **inscriptions** (companies s'inscrivent aux événements, admin approuve) vers un flux basé sur les **invitations** (admin invite directement les companies aux événements via `event_participants`).

## Changements effectués

### 1. Suppression du dossier `/company/registrations`
- **Fichier supprimé**: `/frontend/app/company/registrations/page.tsx`
- **Raison**: Cette page permettait aux companies de gérer leurs inscriptions (pending, approved, rejected), ce qui n'est plus pertinent dans le flux par invitation

### 2. Nettoyage du dashboard company (`/frontend/app/company/page.tsx`)

#### Types TypeScript modifiés
```typescript
// AVANT
type DashboardStats = {
  total_registrations: number
  pending_registrations: number
  approved_registrations: number
  rejected_registrations: number
  confirmed_bookings: number
  available_events: number
}

type UpcomingEvent = {
  ...
  registration_status: 'not_registered' | 'pending' | 'approved' | 'rejected'
  ...
}

// APRÈS
type DashboardStats = {
  invited_events: number          // Uniquement les événements invités
  confirmed_bookings: number
  available_events: number
}

type UpcomingEvent = {
  ...
  // Pas de registration_status - tous les événements affichés sont invités
  ...
}
```

#### Requêtes modifiées
- ❌ Supprimé: Requêtes sur `event_registrations`
- ✅ Ajouté: Requêtes sur `event_participants` pour obtenir les événements invités

#### UI simplifiée
- ❌ Supprimé: Section "Registration Journey" avec statuts pending/approved/rejected
- ✅ Ajouté: Section "Event Invitation Journey" montrant uniquement les événements invités
- ❌ Supprimé: Badge dynamique "Approved/Pending/Rejected"
- ✅ Ajouté: Badge simple "Invited" pour tous les événements affichés
- ❌ Supprimé: Logique conditionnelle pour afficher "Register" ou "View Event"
- ✅ Ajouté: Bouton unique "View Event →" pour tous les événements

### 3. Nettoyage de la liste des événements (`/frontend/app/company/events/page.tsx`)

#### Interface modifiée
```typescript
// AVANT
interface Event {
  ...
  registration_status: 'not_registered' | 'pending' | 'approved' | 'rejected'
  registration_notes?: string
}

// APRÈS
interface Event {
  ...
  is_invited: boolean
}
```

#### Logique modifiée
- ❌ Supprimé: Fetch des `event_registrations` avec statuts
- ✅ Ajouté: Fetch des `event_participants` pour vérifier si invited
- ❌ Supprimé: Fonction `getStatusBadge()` avec 4 statuts
- ✅ Ajouté: Fonction simplifiée avec seulement "Invited" ou "Not Invited"
- ❌ Supprimé: Affichage des notes de rejet
- ❌ Supprimé: Boutons conditionnels "S'inscrire" / "Voir détails"
- ✅ Ajouté: Bouton uniforme "View Details" ou "View Event"

### 4. Nettoyage des détails d'événement (`/frontend/app/company/events/[id]/page.tsx`)

#### État simplifié
```typescript
// AVANT
const [registration, setRegistration] = useState<Registration | null>(null)
const [registering, setRegistering] = useState(false)

// APRÈS
const [isInvited, setIsInvited] = useState<boolean>(false)
```

#### Fonctions supprimées
- ❌ `handleRegister()` - Plus de logique d'inscription
- ❌ `handleCancelRegistration()` - Plus d'annulation possible

#### UI simplifiée
- ❌ Supprimé: Section "Registration Status" avec badges pending/approved/rejected
- ✅ Ajouté: Message simple "You are invited" ou "Not invited yet"
- ❌ Supprimé: Bouton "S'inscrire à cet événement"
- ❌ Supprimé: Bouton "Annuler" pour inscriptions pending
- ✅ Ajouté: Bouton "Create an offer" uniquement si invited

### 5. Nettoyage de la création d'offres (`/frontend/app/company/offers/new/page.tsx`)

#### Requête modifiée
```typescript
// AVANT
const { data: registrations } = await supabase
  .from('event_registrations')
  .select(`event:events (...)`)
  .eq('status', 'approved')

// APRÈS
const { data: participations } = await supabase
  .from('event_participants')
  .select(`events (...)`)
```

## Fichiers non modifiés

### Fichiers admin conservés
- `/frontend/app/admin/events/[id]/registrations/page.tsx`
  - **Raison**: Peut servir pour voir l'historique des anciennes inscriptions si nécessaire
  - **Note**: Cette page utilise `fn_get_event_registrations` qui pourrait ne rien retourner si la table est vide

### Migrations conservées
- `/supabase/migrations/20251102000015_event_registrations_and_offer_events.sql`
- `/supabase/migrations/20251102000017_event_registrations_rpc.sql`
  - **Raison**: Migrations historiques, ne doivent pas être supprimées
  - **Note**: La table `event_registrations` existe toujours dans la DB mais n'est plus utilisée

## Résumé des changements

| Aspect | Avant (Registrations) | Après (Invitations) |
|--------|----------------------|---------------------|
| **Table principale** | `event_registrations` | `event_participants` |
| **Flux** | Company s'inscrit → Admin approuve | Admin invite → Company participe |
| **Statuts** | 4 statuts (not_registered, pending, approved, rejected) | 1 état (invited ou non) |
| **Actions company** | S'inscrire, Annuler, Voir statut | Consulter événements invités uniquement |
| **UI Dashboard** | Stats par statut, badges colorés | Stats d'invitations, badges simples |
| **Création d'offres** | Uniquement pour événements approved | Uniquement pour événements invités |

## Tests recommandés

Après ce nettoyage, tester :

1. ✅ Dashboard company affiche "1 invited event" (Tech Career Fair 2025)
2. ✅ Badge "Invited" apparaît sur les cartes d'événements
3. ✅ Bouton "View Event →" fonctionne correctement
4. ✅ Page détails d'événement affiche "You are invited"
5. ✅ Création d'offre liste uniquement les événements invités
6. ✅ Pas d'erreurs TypeScript dans les fichiers modifiés

## Fichiers modifiés

Total : 5 fichiers

1. `/frontend/app/company/page.tsx` - Dashboard principal
2. `/frontend/app/company/events/page.tsx` - Liste des événements
3. `/frontend/app/company/events/[id]/page.tsx` - Détails d'un événement
4. `/frontend/app/company/offers/new/page.tsx` - Création d'offre
5. ❌ Supprimé: `/frontend/app/company/registrations/page.tsx`

## Architecture finale

```
Companies Flow (Invite-Only):
1. Admin crée un événement
2. Admin invite une company via event_participants
3. Company voit l'événement dans son dashboard
4. Company peut créer des offres pour cet événement
5. Company peut créer des slots d'interview
6. Students réservent les slots

Tables utilisées:
- event_participants (company ↔ event)
- offers (company proposals)
- event_slots (interview availability)
- interview_bookings (student reservations)

Tables dépréciées:
- event_registrations (plus utilisée dans le frontend)
```

## Notes importantes

⚠️ **La table `event_registrations` existe toujours dans la DB** mais n'est plus utilisée par le frontend. Elle pourrait contenir des données historiques.

⚠️ **Les migrations ne doivent pas être supprimées** car elles font partie de l'historique du schéma de la DB.

⚠️ **Le fichier admin `/admin/events/[id]/registrations/page.tsx` est conservé** mais pourrait être supprimé ultérieurement si on confirme qu'il n'est plus nécessaire.

✅ **Tous les fichiers company sont maintenant alignés** avec le nouveau flux par invitation uniquement.
