import { CandidaturePourDirecteur, DirecteurProfile, LaboratoireRecord, SujetRecord } from '../types/cedoc';

export const SPECIALITES_INITIALES: string[] = [
  'Génie logiciel',
  'Ingénierie des données',
  'Réseaux et sécurité',
  'Gestion des ressources humaines',
  'Management',
  'Génie logistique',
  'Génie mécanique',
  'Génie industriel',
  'Bio-alimentaire',
];

export function getSubjectPrerequis(sujet: SujetRecord): string {
  if (sujet.prerequis) return sujet.prerequis;
  switch (sujet.discipline) {
    case 'Génie logiciel':
      return "Master ou Diplôme d'Ingénieur en Informatique ou Génie Logiciel. Solides bases en génie logiciel et architecture.";
    case 'Ingénierie des données':
      return "Master ou Diplôme d'Ingénieur en Science des Données ou IA. Maîtrise de l'apprentissage automatique et du traitement des données massives.";
    case 'Réseaux et sécurité':
      return "Master ou Diplôme d'Ingénieur en Réseaux, Télécommunications ou Cybersécurité. Connaissances en protocoles et sécurité système.";
    case 'Gestion des ressources humaines':
      return "Master en Sciences de Gestion, GRH ou Management Organisationnel. Aisance avec les méthodes d'enquêtes mixtes.";
    case 'Management':
      return "Master en Management Stratégique, Économie Appliquée ou Gestion de Projets. Capacités d'analyse quantitative et qualitative.";
    case 'Génie logistique':
      return "Master ou Diplôme d'Ingénieur en Supply Chain, Logistique ou Recherche Opérationnelle. Maîtrise des outils d'optimisation.";
    case 'Génie mécanique':
      return "Master ou Diplôme d'Ingénieur en Génie Mécanique, Matériaux ou Mécatronique. Maîtrise des éléments finis et simulation.";
    case 'Génie industriel':
      return "Master ou Diplôme d'Ingénieur en Génie Industriel, Automatique ou Productique. Compétences en modélisation et optimisation des flux.";
    case 'Bio-alimentaire':
      return "Master ou Diplôme d'Ingénieur en Biotechnologie, Agroalimentaire ou Chimie Appliquée. Expérience du travail en laboratoire de bio-analyse.";
    default:
      return "Master ou Diplôme d'Ingénieur dans une discipline scientifique ou managériale connexe. Excellente rigueur méthodologique.";
  }
}

export const INITIAL_LABORATOIRES: LaboratoireRecord[] = [
  {
    id: 'lab_init_lisa',
    code: 'LISA',
    nom: "Laboratoire d'Informatique, Signaux et Automatique",
    directeurs: ['Pr. Karim El Mansouri', 'Pr. Nadia Bennani', 'Pr. Youssef Tazi'],
    disciplines: ['Génie logiciel', 'Ingénierie des données', 'Réseaux et sécurité'],
  },
  {
    id: 'lab_init_limad',
    code: 'LIMAD',
    nom: "Laboratoire d'Ingénierie Mathématique et Analyse des Données",
    directeurs: ['Pr. Rachid Chraibi', 'Pr. Salma Berrada'],
    disciplines: ['Génie logiciel', 'Ingénierie des données', 'Réseaux et sécurité'],
  },
  {
    id: 'lab_init_larem',
    code: 'LAREM',
    nom: 'Laboratoire de Recherche en Management et Organisations',
    directeurs: ['Pr. Hassan Ouazzani', 'Pr. Laila Kettani', 'Pr. Omar Filali'],
    disciplines: ['Gestion des ressources humaines', 'Management', 'Génie logistique'],
  },
  {
    id: 'lab_init_lgim',
    code: 'LGIM',
    nom: 'Laboratoire de Génie Industriel et Mécanique Avancée',
    directeurs: ['Pr. Driss Alaoui', 'Pr. Meriem Tahiri', 'Pr. Amine Sebti'],
    disciplines: ['Génie logistique', 'Génie mécanique', 'Génie industriel'],
  },
  {
    id: 'lab_init_lb2a',
    code: 'LB2A',
    nom: 'Laboratoire de Biotechnologie et Agro-Alimentaire',
    directeurs: ['Pr. Fatima Zahra Idrissi', 'Pr. Mohammed Lahlou'],
    disciplines: ['Génie industriel', 'Bio-alimentaire'],
  },
];

export const DIRECTEUR_INFO_MAP: Record<string, { email: string; laboratoire: string }> = {
  'Pr. Karim El Mansouri': { email: 'k.elmansouri@usmba.ac.ma', laboratoire: 'LISA' },
  'Pr. Nadia Bennani': { email: 'n.bennani@usmba.ac.ma', laboratoire: 'LISA' },
  'Pr. Youssef Tazi': { email: 'y.tazi@usmba.ac.ma', laboratoire: 'LISA' },
  'Pr. Rachid Chraibi': { email: 'r.chraibi@usmba.ac.ma', laboratoire: 'LIMAD' },
  'Pr. Salma Berrada': { email: 's.berrada@usmba.ac.ma', laboratoire: 'LIMAD' },
  'Pr. Hassan Ouazzani': { email: 'h.ouazzani@usmba.ac.ma', laboratoire: 'LAREM' },
  'Pr. Laila Kettani': { email: 'l.kettani@usmba.ac.ma', laboratoire: 'LAREM' },
  'Pr. Omar Filali': { email: 'o.filali@usmba.ac.ma', laboratoire: 'LAREM' },
  'Pr. Driss Alaoui': { email: 'd.alaoui@usmba.ac.ma', laboratoire: 'LGIM' },
  'Pr. Meriem Tahiri': { email: 'm.tahiri@usmba.ac.ma', laboratoire: 'LGIM' },
  'Pr. Amine Sebti': { email: 'a.sebti@usmba.ac.ma', laboratoire: 'LGIM' },
  'Pr. Fatima Zahra Idrissi': { email: 'fz.idrissi@usmba.ac.ma', laboratoire: 'LB2A' },
  'Pr. Mohammed Lahlou': { email: 'm.lahlou@usmba.ac.ma', laboratoire: 'LB2A' },
};

export const INITIAL_SUJETS: SujetRecord[] = [
  // 1. Génie logiciel (3 sujets : 2 LISA, 1 LIMAD)
  {
    id: 'sujet_init_01',
    intitule: 'Vérification formelle des architectures microservices critiques dans le cloud hybride',
    description:
      "Les déploiements continus d'architectures microservices en cloud hybride exposent les services critiques à des défaillances d'interaction difficiles à anticiper. Cette thèse vise à garantir formellement la cohérence comportementale des échanges asynchrones. L'approche couple model-checking compositionnel, contrats d'interfaces typés et synthèse de moniteurs d'exécution. Les résultats attendus incluent un cadriciel de certification automatisée réduisant les régressions en production.",
    discipline: 'Génie logiciel',
    directeur: 'Pr. Karim El Mansouri',
    directeurEmail: 'k.elmansouri@usmba.ac.ma',
    laboratoire: 'LISA',
    statut: 'Publié',
    prerequis: 'Master ou Ingénieur en Informatique. Maîtrise des méthodes formelles et du cloud computing.',
  },
  {
    id: 'sujet_init_02',
    intitule: 'Ingénierie dirigée par les modèles pour les systèmes embarqués temps réel adaptatifs',
    description:
      "Les systèmes cyber-physiques autonomes doivent reconfigurer leurs fonctions embarquées face aux variations d'environnement tout en respectant des échéances strictes. Ce projet doctoral a pour objectif d'automatiser la génération de code temps réel certifiable. La méthodologie associe méta-modélisation multi-vues, ordonnancement adaptatif et co-simulation énergétique. Les travaux aboutiront à une chaîne outillée validée sur calculateur embarqué multicœur.",
    discipline: 'Génie logiciel',
    directeur: 'Pr. Nadia Bennani',
    directeurEmail: 'n.bennani@usmba.ac.ma',
    laboratoire: 'LISA',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_03',
    intitule: 'Détection précoce de la dette technique logicielle par analyse statique et apprentissage automatique',
    description:
      "L'accumulation rapide de dette technique dans les grands patrimoines logiciels dégrade la maintenabilité et ralentit les cycles de livraison. Cette thèse vise à prédire précocement les modules à haut risque de dégradation architecturale. L'approche fusionne graphes de dépendances syntaxiques, historique multi-versions des dépôts et réseaux neuronaux sur graphes. Le résultat attendu est un assistant de refactorisation priorisée évalué sur projets industriels.",
    discipline: 'Génie logiciel',
    directeur: 'Pr. Rachid Chraibi',
    directeurEmail: 'r.chraibi@usmba.ac.ma',
    laboratoire: 'LIMAD',
    statut: 'Publié',
  },

  // 2. Ingénierie des données (3 sujets : 1 LISA, 2 LIMAD)
  {
    id: 'sujet_init_04',
    intitule: 'Intelligence artificielle fédérée pour le diagnostic médical multimodal respectueux de la vie privée',
    description:
      "Les réglementations sur les données de santé limitent la centralisation des examens d'imagerie et des dossiers cliniques entre établissements hospitaliers. Ce travail doctoral vise à entraîner collaborativement des modèles diagnostiques multimodaux sans transfert des données brutes. L'approche combine apprentissage fédéré robuste aux hétérogénéités statistiques et confidentialité différentielle. Les résultats attendus comprennent des algorithmes certifiables testés sur cohortes hospitalières multicentriques.",
    discipline: 'Ingénierie des données',
    directeur: 'Pr. Nadia Bennani',
    directeurEmail: 'n.bennani@usmba.ac.ma',
    laboratoire: 'LISA',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_05',
    intitule: 'Architecture de lacs de données temps réel pour la prévision hydrologique dans le bassin du Sebou',
    description:
      "La variabilité hydroclimatique accentuée dans le bassin du Sebou impose une surveillance intégrée des ressources hydriques et des risques d'inondation. Cette thèse a pour objectif de concevoir une plateforme décisionnelle d'anticipation des crues et sécheresses. La démarche articule ingestion temps réel de flux satellitaires et limnimétriques avec des modèles spatio-temporels hybrides. Le projet livrera un démonstrateur opérationnel de prévision hydrologique régionale.",
    discipline: 'Ingénierie des données',
    directeur: 'Pr. Salma Berrada',
    directeurEmail: 's.berrada@usmba.ac.ma',
    laboratoire: 'LIMAD',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_06',
    intitule: 'Graphes de connaissances dynamiques et intelligence artificielle explicable pour la veille scientifique',
    description:
      "La croissance exponentielle des publications scientifiques et des brevets rend complexe le repérage rapide des ruptures technologiques émergentes. Cette recherche vise à automatiser la cartographie évolutive des savoirs tout en justifiant chaque recommandation analytique. L'approche associe extraction sémantique multilingue, graphes de connaissances temporels et mécanismes d'inférence explicables. Les résultats attendus fourniront un moteur d'aide à la veille stratégique vérifiable par les experts.",
    discipline: 'Ingénierie des données',
    directeur: 'Pr. Rachid Chraibi',
    directeurEmail: 'r.chraibi@usmba.ac.ma',
    laboratoire: 'LIMAD',
    statut: 'Publié',
  },

  // 3. Réseaux et sécurité (3 sujets : 2 LISA, 1 LIMAD)
  {
    id: 'sujet_init_07',
    intitule: "Détection d'intrusions coopérative dans les réseaux industriels IoT à faible consommation",
    description:
      "Les réseaux de capteurs industriels à basse consommation demeurent vulnérables aux attaques distribuées furtives en raison de leurs fortes contraintes matérielles. Cette thèse vise à détecter les intrusions en temps réel sans épuiser l'autonomie énergétique des nœuds. L'approche repose sur une corrélation coopérative légère entre objets contraints et passerelles périphériques. Les travaux produiront un protocole sécurisé à faible taux de fausses alertes.",
    discipline: 'Réseaux et sécurité',
    directeur: 'Pr. Youssef Tazi',
    directeurEmail: 'y.tazi@usmba.ac.ma',
    laboratoire: 'LISA',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_08',
    intitule: 'Protocoles cryptographiques post-quantiques adaptés aux infrastructures véhiculaire V2X',
    description:
      "L'émergence du calcul quantique remet en cause la sécurité des signatures asymétriques protégeant les communications véhiculaires coopératives V2X. Ce travail doctoral a pour objectif de concevoir des schémas d'authentification résistants aux attaques quantiques sous contrainte de latence milliseconde. La méthodologie adapte la cryptographie sur réseaux euclidiens aux environnements à forte mobilité. Les résultats attendus incluent un protocole normalisable validé sur banc embarqué.",
    discipline: 'Réseaux et sécurité',
    directeur: 'Pr. Karim El Mansouri',
    directeurEmail: 'k.elmansouri@usmba.ac.ma',
    laboratoire: 'LISA',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_09',
    intitule: 'Orchestration zéro-confiance et tranchage dynamique des réseaux 5G et 6G privés',
    description:
      "Le déploiement de réseaux cellulaires privés 5G et pré-6G dans les sites industriels multiplie les surfaces d'exposition aux mouvements latéraux malveillants. Cette thèse vise à automatiser le confinement instantané des menaces par isolation dynamique des tranches réseau. L'approche combine plan de données programmable, architecture zéro-confiance et apprentissage par renforcement profond. Les résultats attendus offriront un orchestrateur autonome garantissant la continuité de service critique.",
    discipline: 'Réseaux et sécurité',
    directeur: 'Pr. Salma Berrada',
    directeurEmail: 's.berrada@usmba.ac.ma',
    laboratoire: 'LIMAD',
    statut: 'Publié',
  },

  // 4. Gestion des ressources humaines (3 sujets : 3 LAREM)
  {
    id: 'sujet_init_10',
    intitule: 'Transformation digitale des pratiques RH et fidélisation des compétences dans les PME industrielles marocaines',
    description:
      "Les PME industrielles marocaines font face à une forte tension sur le recrutement et la rétention des profils techniques qualifiés. Cette recherche doctorale vise à évaluer l'impact de la digitalisation des pratiques RH sur l'engagement durable des collaborateurs. L'approche méthodologique croise études longitudinales de terrain et modélisation par équations structurelles. Les résultats attendus proposeront un référentiel managérial de fidélisation adapté au contexte régional.",
    discipline: 'Gestion des ressources humaines',
    directeur: 'Pr. Laila Kettani',
    directeurEmail: 'l.kettani@usmba.ac.ma',
    laboratoire: 'LAREM',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_11',
    intitule: 'Gestion prévisionnelle des emplois et accompagnement de la reconversion face à l’automatisation',
    description:
      "L'introduction accélérée de la robotisation et des outils numériques transforme profondément les référentiels de métiers dans les filières manufacturières. Cette thèse a pour objectif de renouveler les dispositifs de gestion prévisionnelle des emplois et des compétences. La démarche combine cartographie prospective des emplois sensibles et ingénierie de parcours certifiants internes. Les travaux déboucheront sur un modèle opérationnel d'accompagnement des reconversions professionnelles.",
    discipline: 'Gestion des ressources humaines',
    directeur: 'Pr. Hassan Ouazzani',
    directeurEmail: 'h.ouazzani@usmba.ac.ma',
    laboratoire: 'LAREM',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_12',
    intitule: 'Organisation hybride du travail, bien-être professionnel et performance collective dans le secteur tertiaire',
    description:
      "L'ancrage durable des modes d'organisation hybrides redéfinit la coordination des équipes, l'autonomie individuelle et l'équilibre des temps sociaux dans les services. Ce travail doctoral vise à identifier les déterminants organisationnels conciliant santé psychologique au travail et performance collective. L'approche mobilise une enquête mixte multi-entreprises associant entretiens semi-directifs et panel quantitatif. Les résultats fourniront des grilles d'évaluation et de régulation managériale.",
    discipline: 'Gestion des ressources humaines',
    directeur: 'Pr. Laila Kettani',
    directeurEmail: 'l.kettani@usmba.ac.ma',
    laboratoire: 'LAREM',
    statut: 'Publié',
  },

  // 5. Management (3 sujets : 3 LAREM)
  {
    id: 'sujet_init_13',
    intitule: 'Gouvernance durable et pilotage de la performance extra-financière des entreprises exportatrices',
    description:
      "Les nouvelles exigences réglementaires internationales en matière de décarbonation et de traçabilité ESG redessinent la compétitivité des entreprises exportatrices marocaines. Cette thèse vise à concevoir un système intégré de pilotage articulant performance financière et responsabilité socio-environnementale. L'approche s'appuie sur la recherche-intervention auprès d'industriels exportateurs et l'analyse multicritère. Les résultats attendus livreront un tableau de bord stratégique d'alignement carbone.",
    discipline: 'Management',
    directeur: 'Pr. Hassan Ouazzani',
    directeurEmail: 'h.ouazzani@usmba.ac.ma',
    laboratoire: 'LAREM',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_14',
    intitule: 'Écosystèmes territoriaux d’innovation et financement de l’entrepreneuriat technologique au Maroc',
    description:
      "Malgré la multiplication des structures d'incubation, le passage des preuves de concept universitaires vers l'industrialisation commerciale demeure freiné par des asymétries de coordination. Cette thèse vise à modéliser l'articulation entre laboratoires, incubateurs territoriaux et fonds d'amorçage. L'approche mobilise l'analyse de réseaux inter-organisationnels et des études économétriques sur jeunes pousses technologiques. Les résultats formuleront des mécanismes de gouvernance accélérant le transfert technologique.",
    discipline: 'Management',
    directeur: 'Pr. Omar Filali',
    directeurEmail: 'o.filali@usmba.ac.ma',
    laboratoire: 'LAREM',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_15',
    intitule: 'Résilience stratégique des coopératives régionales et intégration aux circuits de distribution modernes',
    description:
      "Les coopératives de produits du terroir de la région Fès-Meknès rencontrent d'importantes barrières normatives et commerciales pour accéder aux enseignes modernes et à l'export. Cette recherche vise à renforcer leur résilience organisationnelle et leur création de valeur locale. La démarche combine diagnostic participatif de gouvernance, standardisation qualité et stratégies omnicanales. Les travaux aboutiront à un guide opérationnel de professionnalisation coopérative.",
    discipline: 'Management',
    directeur: 'Pr. Hassan Ouazzani',
    directeurEmail: 'h.ouazzani@usmba.ac.ma',
    laboratoire: 'LAREM',
    statut: 'Publié',
  },

  // 6. Génie logistique (3 sujets : 1 LAREM, 2 LGIM)
  {
    id: 'sujet_init_16',
    intitule: 'Coordination contractuelle et partage des risques dans les chaînes logistiques agro-exportatrices',
    description:
      "Les filières agro-exportatrices périssables subissent simultanément des aléas climatiques d'approvisionnement, des ruptures de chaîne du froid et une forte volatilité des prix. Ce travail doctoral vise à aligner les décisions des producteurs, conditionneurs et transporteurs. L'approche conjugue théorie des jeux coopératifs et programmation stochastique multi-étapes. Les résultats attendus établiront des contrats incitatifs réduisant les pertes post-récolte et stabilisant les marges.",
    discipline: 'Génie logistique',
    directeur: 'Pr. Omar Filali',
    directeurEmail: 'o.filali@usmba.ac.ma',
    laboratoire: 'LAREM',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_17',
    intitule: 'Optimisation multi-objectif de la logistique urbaine décarbonée du dernier kilomètre',
    description:
      "La croissance rapide du commerce électronique engendre une congestion accrue et une hausse des émissions polluantes dans les centres urbains denses. Cette thèse vise à optimiser conjointement l'implantation de micro-dépôts urbains et les tournées de flottes électriques. La méthodologie associe programmation linéaire mixte et métaheuristiques évolutionnaires sous fenêtres horaires dynamiques. Les résultats attendus fourniront un outil d'aide à la planification urbaine durable.",
    discipline: 'Génie logistique',
    directeur: 'Pr. Amine Sebti',
    directeurEmail: 'a.sebti@usmba.ac.ma',
    laboratoire: 'LGIM',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_18',
    intitule: 'Jumeaux numériques pour la planification résiliente des corridors portuaires et ferroviaires',
    description:
      "Les corridors logistiques intermodaux reliant terminaux portuaires et plateformes ferroviaires sont fortement exposés aux retards maritimes et aux engorgements de manutention. Ce projet doctoral a pour objectif de piloter dynamiquement la réallocation des capacités de stockage et de traction. L'approche couple simulation à événements discrets, flux temps réel et optimisation en ligne. Le livrable attendu est un jumeau numérique d'aide à la résilience intermodale.",
    discipline: 'Génie logistique',
    directeur: 'Pr. Meriem Tahiri',
    directeurEmail: 'm.tahiri@usmba.ac.ma',
    laboratoire: 'LGIM',
    statut: 'Publié',
  },

  // 7. Génie mécanique (3 sujets : 3 LGIM)
  {
    id: 'sujet_init_19',
    intitule: 'Comportement thermomécanique et endommagement en fatigue des matériaux composites biosourcés',
    description:
      "La substitution des fibres synthétiques par des fibres végétales locales constitue un levier majeur d'allègement écologique pour l'industrie des transports. Cette thèse vise à caractériser et prédire la tenue en fatigue cyclique et au vieillissement hygrothermique de biocomposites structuraux. L'approche articule essais multiaxiaux instrumentés par corrélation d'images et modélisation micromécanique par éléments finis. Les résultats établiront des lois d'endommagement fiables pour le dimensionnement industriel.",
    discipline: 'Génie mécanique',
    directeur: 'Pr. Driss Alaoui',
    directeurEmail: 'd.alaoui@usmba.ac.ma',
    laboratoire: 'LGIM',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_20',
    intitule: 'Optimisation topologique et maîtrise des contraintes résiduelles en fabrication additive métallique',
    description:
      "La fusion laser sur lit de poudre métallique induit de sévères gradients thermiques provoquant déformations géométriques et fissurations résiduelles sur les pièces complexes. Ce travail doctoral vise à intégrer directement les contraintes du procédé dès la phase de conception géométrique. La méthodologie couple simulation thermomécanique réduite rapide et algorithmes d'optimisation topologique multiphysique. Les résultats attendus permettront de fabriquer des composants allégés sans reprise coûteuse.",
    discipline: 'Génie mécanique',
    directeur: 'Pr. Driss Alaoui',
    directeurEmail: 'd.alaoui@usmba.ac.ma',
    laboratoire: 'LGIM',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_21',
    intitule: 'Analyse vibratoire non linéaire des transmissions mécaniques pour le diagnostic précoce des défauts',
    description:
      "Les transmissions par engrenages et roulements des machines tournantes industrielles opèrent sous des régimes fortement variables qui masquent les signatures vibratoires d'endommagement naissant. Cette thèse a pour objectif de détecter précocement l'écaillage et la fissuration sous charge fluctuante. L'approche associe modélisation dynamique non linéaire et traitement cyclo-stationnaire adaptatif des signaux vibratoires et acoustiques. Les travaux livreront des indicateurs robustes validés sur banc d'essai.",
    discipline: 'Génie mécanique',
    directeur: 'Pr. Meriem Tahiri',
    directeurEmail: 'm.tahiri@usmba.ac.ma',
    laboratoire: 'LGIM',
    statut: 'Publié',
  },

  // 8. Génie industriel (3 sujets : 2 LGIM, 1 LB2A)
  {
    id: 'sujet_init_22',
    intitule: 'Maintenance prédictive multi-capteurs et ordonnancement conjoint de la production en usine 4.0',
    description:
      "Dans les ateliers manufacturiers flexibles, la planification des ordres de fabrication et les interventions de maintenance restent souvent traitées séparément, générant des arrêts imprévus coûteux. Cette thèse vise à unifier pronostic de dégradation et pilotage d'atelier. L'approche fusionne des données multi-capteurs pour estimer la durée de vie résiduelle et l'intègre dans un ordonnancement robuste. Les résultats attendus réduiront les temps d'indisponibilité et les retards de livraison.",
    discipline: 'Génie industriel',
    directeur: 'Pr. Amine Sebti',
    directeurEmail: 'a.sebti@usmba.ac.ma',
    laboratoire: 'LGIM',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_23',
    intitule: 'Sobriété énergétique et récupération thermique dans les lignes de production manufacturière continue',
    description:
      "La hausse structurelle des coûts énergétiques et les objectifs de neutralité carbone imposent une refonte thermique des lignes manufacturières continues énergivores. Ce sujet doctoral vise à minimiser la consommation spécifique d'énergie primaire à l'échelle de l'atelier. La démarche combine analyse exergétique, intégration des rejets de chaleur fatale et séquencement asservi aux énergies renouvelables locales. Les travaux fourniront une méthodologie reproductible d'optimisation énergétique industrielle.",
    discipline: 'Génie industriel',
    directeur: 'Pr. Driss Alaoui',
    directeurEmail: 'd.alaoui@usmba.ac.ma',
    laboratoire: 'LGIM',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_24',
    intitule: 'Maîtrise statistique des procédés et traçabilité qualité dans les unités de transformation agro-industrielle',
    description:
      "L'hétérogénéité naturelle des matières premières agricoles complique le maintien d'une qualité constante sur les lignes de transformation agro-industrielle continue. Cette thèse vise à détecter instantanément les dérives physico-chimiques en cours de production. L'approche associe cartes de contrôle multivariées adaptatives, capteurs spectroscopiques en ligne et traçabilité numérique par lot. Les résultats attendus réduiront les rebuts tout en garantissant la conformité sanitaire réglementaire.",
    discipline: 'Génie industriel',
    directeur: 'Pr. Mohammed Lahlou',
    directeurEmail: 'm.lahlou@usmba.ac.ma',
    laboratoire: 'LB2A',
    statut: 'Publié',
  },

  // 9. Bio-alimentaire (3 sujets : 3 LB2A)
  {
    id: 'sujet_init_25',
    intitule: 'Biovalorisation des sous-produits oléicoles pour l’extraction éco-responsable de molécules bioactives',
    description:
      "L'industrie oléicole de la région Fès-Meknès génère d'importants volumes de grignons et de margines riches en polyphénols antioxydants encore peu valorisés. Ce travail doctoral vise à extraire proprement ces biomolécules à haute valeur ajoutée sans solvants pétrochimiques. L'approche combine éco-extraction assistée par ultrasons, solvants eutectiques profonds et stabilisation par micro-encapsulation. Les résultats attendus déboucheront sur des ingrédients fonctionnels naturels pour l'agroalimentaire.",
    discipline: 'Bio-alimentaire',
    directeur: 'Pr. Fatima Zahra Idrissi',
    directeurEmail: 'fz.idrissi@usmba.ac.ma',
    laboratoire: 'LB2A',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_26',
    intitule: 'Développement d’emballages biodégradables actifs à base de biopolymères pour la conservation alimentaire',
    description:
      "La réduction des plastiques à usage unique dans la chaîne alimentaire exige de nouveaux matériaux barrières biosourcés capables de freiner l'altération microbiologique. Cette thèse a pour objectif de formuler des films biodégradables actifs issus de sous-produits agro-industriels locaux. La méthodologie associe ingénierie des biopolymères, incorporation d'extraits antimicrobiens naturels et caractérisation physico-mécanique. Les résultats attendus prolongeront significativement la conservation des denrées fraîches méditerranéennes.",
    discipline: 'Bio-alimentaire',
    directeur: 'Pr. Fatima Zahra Idrissi',
    directeurEmail: 'fz.idrissi@usmba.ac.ma',
    laboratoire: 'LB2A',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_27',
    intitule: 'Fermentation dirigée par souches autochtones pour l’amélioration nutritionnelle des produits céréaliers',
    description:
      "La présence élevée de phytates dans les céréales complètes limite l'assimilation digestive des minéraux essentiels tels que le fer et le zinc. Ce projet doctoral vise à enrichir naturellement la valeur nutritionnelle et sensorielle des produits céréaliers traditionnels. L'approche repose sur l'isolement de bactéries lactiques et levures autochtones et le pilotage cinétique de fermentations dirigées. Les travaux livreront des ferments starters prêts au transfert artisanal et industriel.",
    discipline: 'Bio-alimentaire',
    directeur: 'Pr. Mohammed Lahlou',
    directeurEmail: 'm.lahlou@usmba.ac.ma',
    laboratoire: 'LB2A',
    statut: 'Publié',
  },
];

export const INITIAL_DIRECTEURS: Array<DirecteurProfile> = [
  {
    id: 'dir_karim',
    prenom: 'Karim',
    nom: 'El Mansouri',
    nomComplet: 'Pr. Karim El Mansouri',
    email: 'k.elmansouri@usmba.ac.ma',
    telephone: '+212 5 35 60 05 84',
    grade: "Professeur de l'Enseignement Supérieur (PES)",
    etablissement: 'EST Fès',
    departement: 'Génie Informatique',
    avatarUrl: '',
  },
  {
    id: 'dir_nadia',
    prenom: 'Nadia',
    nom: 'Bennani',
    nomComplet: 'Pr. Nadia Bennani',
    email: 'n.bennani@usmba.ac.ma',
    telephone: '+212 5 35 60 05 85',
    grade: 'Professeur Habilité (PH)',
    etablissement: 'EST Fès',
    departement: 'Génie Informatique',
    avatarUrl: '',
  },
  {
    id: 'dir_rachid',
    prenom: 'Rachid',
    nom: 'Chraibi',
    nomComplet: 'Pr. Rachid Chraibi',
    email: 'r.chraibi@usmba.ac.ma',
    telephone: '+212 5 35 60 05 86',
    grade: "Professeur de l'Enseignement Supérieur (PES)",
    etablissement: 'EST Fès',
    departement: 'Mathématiques & Informatique',
    avatarUrl: '',
  },
  {
    id: 'dir_youssef',
    prenom: 'Youssef',
    nom: 'Tazi',
    nomComplet: 'Pr. Youssef Tazi',
    email: 'y.tazi@usmba.ac.ma',
    telephone: '+212 5 35 60 05 87',
    grade: 'Professeur Assistant (PA)',
    etablissement: 'EST Fès',
    departement: 'Génie Informatique',
    avatarUrl: '',
  },
];

export const INITIAL_CANDIDATURES_DIRECTEUR: CandidaturePourDirecteur[] = [];

