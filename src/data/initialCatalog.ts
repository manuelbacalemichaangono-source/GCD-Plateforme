import { LaboratoireRecord, SujetRecord } from '../types/cedoc';

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

export const INITIAL_SUJETS: SujetRecord[] = [
  // 1. Génie logiciel (3 sujets : 2 LISA, 1 LIMAD)
  {
    id: 'sujet_init_01',
    intitule: 'Vérification formelle des architectures microservices critiques dans le cloud hybride',
    description:
      'Conception de modèles de vérification automatique des contrats de services distribués afin de prévenir les régressions lors des déploiements continus.',
    discipline: 'Génie logiciel',
    directeur: 'Pr. Karim El Mansouri',
    directeurEmail: 'k.elmansouri@usmba.ac.ma',
    laboratoire: 'LISA',
    statut: 'Publié',
  },
  {
    id: 'sujet_init_02',
    intitule: 'Ingénierie dirigée par les modèles pour les systèmes embarqués temps réel adaptatifs',
    description:
      'Génération automatique de code certifiable et ordonnancement dynamique pour les systèmes cyber-physiques soumis à des contraintes énergétiques strictes.',
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
      "Développement d'indicateurs prédictifs de maintenabilité sur les grands dépôts logiciels évolutifs par analyse conjointe du graphe de dépendances et de l'historique.",
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
      "Apprentissage collaboratif distribué sur données hospitalières hétérogènes sans centralisation des dossiers patients, avec garanties de confidentialité différentielle.",
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
      'Ingestion massive de séries temporelles issues de capteurs environnementaux et satellites pour la modélisation prédictive des ressources hydriques régionales.',
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
      'Construction et mise à jour incrémentale de graphes sémantiques à partir de corpus multilingues avec justification traçable des inférences.',
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
      'Conception de mécanismes légers de corrélation distribuée des anomalies réseau pour sécuriser les capteurs industriels sous contraintes de mémoire.',
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
      "Évaluation et optimisation des schémas d'authentification résistants au calcul quantique pour les communications véhiculaires à très faible latence.",
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
      "Allocation adaptative des ressources radio et isolation automatique des tranches réseau face aux attaques par déni de service distribué.",
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
      "Étude empirique de l'adoption des systèmes d'information RH sur l'engagement organisationnel et la rétention des profils techniques qualifiés.",
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
      'Modélisation des trajectoires de montée en compétences des opérateurs et cadres intermédiaires dans les bassins manufacturiers en mutation technologique.',
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
      'Analyse longitudinale des mécanismes de coordination managériale et de prévention des risques psychosociaux au sein des équipes distribuées.',
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
      'Élaboration de tableaux de bord intégrés articulant critères environnementaux, conformité réglementaire internationale et compétitivité coût.',
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
      "Analyse des synergies entre structures d'incubation universitaires, acteurs publics et fonds d'amorçage dans la croissance des jeunes pousses.",
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
      'Étude des modèles de professionnalisation managériale, de labellisation qualité et de commercialisation numérique des coopératives de Fès-Meknès.',
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
      "Modélisation économique des mécanismes d'incitation entre producteurs, plateformes de conditionnement et transporteurs internationaux sous aléas climatiques.",
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
      'Planification dynamique des tournées de véhicules électriques et implantation de micro-entrepôts urbains pour réduire congestion et émissions.',
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
      'Couplage simulation à événements discrets et optimisation stochastique pour absorber les perturbations sur les flux intermodaux de marchandises.',
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
      'Caractérisation expérimentale et modélisation multi-échelle de structures composites renforcées par fibres naturelles pour allègement automobile.',
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
      'Simulation numérique du procédé de fusion laser sur lit de poudre et validation expérimentale des pièces mécaniques à géométrie complexe.',
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
      "Identification paramétrique des signatures vibratoires d'engrenages et de roulements soumis à des régimes de charge et de vitesse variables.",
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
      "Intégration du pronostic de durée de vie résiduelle des équipements critiques dans les décisions d'ordonnancement d'atelier flexible.",
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
      'Modélisation énergétique des postes énergivores et pilotage optimal des consignes opératoires pour réduire l’empreinte carbone industrielle.',
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
      'Déploiement de capteurs spectroscopiques en ligne et de cartes de contrôle multivariées pour sécuriser la conformité sanitaire des lots.',
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
      'Optimisation des procédés verts d’extraction des polyphénols issus des grignons et margines de la région de Fès pour formulation fonctionnelle.',
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
      'Formulation et étude des propriétés barrières et antimicrobiennes de films biosourcés destinés à prolonger la durée de conservation des denrées fraîches.',
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
      'Sélection biotechnologique de ferments lactiques locaux afin d’accroître la biodisponibilité minérale et la digestibilité des matrices céréalières.',
    discipline: 'Bio-alimentaire',
    directeur: 'Pr. Mohammed Lahlou',
    directeurEmail: 'm.lahlou@usmba.ac.ma',
    laboratoire: 'LB2A',
    statut: 'Publié',
  },
];
