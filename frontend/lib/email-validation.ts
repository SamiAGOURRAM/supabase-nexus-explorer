// Liste blanche des emails autorisés (étudiants UM6P)
// Format: prénom.nom@um6p.ma
export const ALLOWED_STUDENT_EMAILS = [
  // TODO: Remplacer par la vraie liste d'emails
  'example.student@um6p.ma',
  // Ajouter tous les emails autorisés ici
]

// Fonction pour vérifier si un email est autorisé
export function isEmailAllowed(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim()
  
  // Vérifier le domaine
  if (!normalizedEmail.endsWith('@um6p.ma')) {
    return false
  }
  
  // Vérifier si l'email est dans la liste blanche
  return ALLOWED_STUDENT_EMAILS.some(
    allowed => allowed.toLowerCase() === normalizedEmail
  )
}

// Fonction pour charger la liste depuis un fichier CSV (optionnel)
export async function loadAllowedEmailsFromCSV(csvContent: string): Promise<string[]> {
  return csvContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.includes('@um6p.ma'))
}

// Message d'erreur standardisé
export const EMAIL_NOT_ALLOWED_MESSAGE = 
  'Votre email n\'est pas dans la liste des étudiants autorisés. Veuillez contacter l\'administration.'
