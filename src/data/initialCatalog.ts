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
      "Ce travail doctoral vise à élaborer un cadre de spécification et de vérification formelle dédié aux architectures à base de microservices déployées sur des infrastructures cloud hybrides. La méthodologie combine la vérification de modèles comportementaux, l'analyse statique des contrats d'interfaces asynchrones et la synthèse automatique de moniteurs d'exécution afin de prévenir toute régression fonctionnelle lors des mises en production continues.",
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
      "L'objectif de cette thèse est de concevoir une chaîne d'ingénierie dirigée par les modèles permettant de générer du code embarqué certifiable pour des systèmes cyber-physiques soumis à de fortes variations d'environnement. Les travaux porteront sur la modélisation conjointe des contraintes temporelles dures et de la consommation énergétique, ainsi que sur des mécanismes de reconfiguration dynamique validés sur cible matérielle.",
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
      "Cette recherche porte sur l'identification prédictive des zones de fragilité architecturale et de dette technique au sein de grands systèmes logiciels évolutifs. En couplant l'analyse du graphe de dépendances syntaxiques, l'historique multi-versions des dépôts de code et des modèles d'apprentissage sur graphes, la thèse proposera un outil d'aide à la refactorisation priorisée validé sur des projets industriels open source.",
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
      "Ce sujet explore l'entraînement collaboratif de modèles d'apprentissage profond multimodaux (imagerie médicale et dossiers cliniques structurés) répartis entre plusieurs établissements hospitaliers sans centralisation des données sensibles. La thèse développera de nouveaux schémas d'agrégation robuste aux hétérogénéités statistiques, assortis de garanties formelles de confidentialité différentielle et d'auditabilité clinique.",
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
      "Ce projet doctoral vise la conception d'une architecture distribuée d'ingestion, de qualification et de croisement en temps réel de flux hétérogènes issus de stations limnimétriques, de capteurs climatiques et d'observations satellitaires. Les travaux aboutiront à des modèles spatio-temporels hybrides pour l'anticipation des épisodes de sécheresse et de crues à l'échelle du bassin hydraulique du Sebou.",
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
      "La thèse s'intéresse à l'extraction automatique d'entités et de relations sémantiques évolutives à partir de vastes corpus scientifiques et brevets multilingues. Elle vise à construire des graphes de connaissances temporels capables de détecter l'émergence de thématiques de rupture tout en fournissant des chemins de raisonnement explicables et vérifiables par les experts du domaine.",
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
      "Les réseaux de capteurs industriels à basse consommation exposent les infrastructures critiques à des attaques furtives difficiles à isoler localement. Cette thèse propose d'élaborer un protocole léger de détection coopérative d'anomalies distribué entre nœuds contraints en mémoire et passerelles périphériques, minimisant le surcoût énergétique tout en maintenant un faible taux de fausses alertes.",
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
      "L'essor de l'informatique quantique menace les mécanismes classiques de signature utilisés dans les réseaux véhiculaires coopératifs (V2X). Ce travail doctoral vise à concevoir, adapter et évaluer des protocoles d'authentification mutuelle fondés sur les réseaux euclidiens respectant les contraintes strictes de latence milliseconde, de mobilité rapide et de bande passante des unités embarquées.",
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
      "Ce sujet porte sur l'automatisation de politiques de sécurité zéro-confiance au sein de réseaux cellulaires privés 5G et pré-6G déployés en milieu industriel. La recherche combinera la programmation du plan de données, l'isolation dynamique des tranches réseau (network slicing) et l'apprentissage par renforcement pour contenir instantanément les mouvements latéraux et les attaques par déni de service.",
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
      "Cette recherche doctorale analyse les effets de la digitalisation des processus ressources humaines sur l'attraction, l'engagement organisationnel et la rétention des compétences techniques au sein des PME industrielles au Maroc. S'appuyant sur une méthodologie mixte mêlant études de cas longitudinales et modélisation par équations structurelles, elle identifiera les leviers managériaux d'appropriation durable.",
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
      "Face à l'intégration rapide de la robotique et des outils numériques dans les filières manufacturières, cette thèse étudie le renouvellement des dispositifs de gestion prévisionnelle des emplois et des compétences (GPEC). Elle vise à construire un référentiel d'anticipation des métiers sensibles et d'ingénierie de parcours de reconversion qualifiante adapté au tissu productif régional.",
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
      "Ce travail doctoral examine les recompositions du contrôle managérial, de la cohésion d'équipe et de la prévention des risques psychosociaux induites par la pérennisation des modes de travail hybrides. À travers une enquête empirique multi-entreprises dans les services, la thèse modélisera les conditions d'équilibre entre autonomie individuelle, santé au travail et performance collective.",
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
      "L'entrée en vigueur de nouvelles exigences environnementales et carbone sur les marchés internationaux transforme la gouvernance des entreprises exportatrices marocaines. Cette thèse vise à concevoir un modèle intégré de contrôle de gestion socio-environnemental articulant indicateurs ESG, traçabilité carbone et maintien de la compétitivité économique sur les chaînes de valeur globales.",
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
      "Cette thèse analyse la dynamique de coordination entre pôles universitaires, incubateurs, dispositifs publics de soutien et capital-amorçage dans l'émergence des jeunes entreprises technologiques. En mobilisant l'approche des écosystèmes entrepreneuriaux, elle évaluera les déterminants du passage de la preuve de concept issue des laboratoires à l'industrialisation commerciale.",
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
      "Ancrée dans la région Fès-Meknès, cette recherche étudie les mécanismes de structuration managériale, de certification qualité et de commercialisation omnicanale des coopératives de produits du terroir. Elle proposera un cadre d'accompagnement stratégique favorisant la création de valeur ajoutée locale, la gouvernance participative et la résilience face aux chocs de marché.",
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
      "Les chaînes logistiques de produits périssables subissent simultanément des aléas de rendement climatique, de chaîne du froid et de volatilité tarifaire. Ce travail doctoral mobilise la théorie des jeux et l'optimisation stochastique pour concevoir des mécanismes contractuels de partage des risques et d'incitation à la qualité entre producteurs, stations de conditionnement et opérateurs logistiques.",
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
      "Cette thèse porte sur la modélisation mathématique et la résolution métaheuristique de problèmes combinés de localisation de micro-plates-formes urbaines et de tournées de véhicules électriques à fenêtres horaires dynamiques. Les algorithmes développés seront évalués sur des scénarios réels d'agglomérations marocaines afin de minimiser conjointement coûts opérationnels, congestion et émissions.",
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
      "Ce sujet vise à développer une architecture de jumeau numérique couplant simulation à événements discrets et optimisation en ligne pour le pilotage des flux intermodaux rail-port. L'outil permettra de tester des politiques de réallocation dynamique des capacités de manutention et de stockage afin d'absorber rapidement les perturbations maritimes et douanières.",
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
      "Cette thèse combine caractérisation expérimentale multiaxiale et modélisation micromécanique par éléments finis pour étudier la tenue en fatigue et au vieillissement hygrothermique de composites renforcés par des fibres végétales locales. L'objectif est d'établir des critères fiables de dimensionnement pour l'allègement structural de pièces secondaires dans le secteur des transports.",
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
      "Le procédé de fusion laser sur lit de poudre métallique génère de forts gradients thermiques responsables de distorsions géométriques et de contraintes résiduelles. Ce projet doctoral intègre directement la simulation thermomécanique rapide du procédé au sein des algorithmes d'optimisation topologique afin de concevoir des pièces mécaniques allégées exemptes de défauts métallurgiques.",
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
      "Ce travail de recherche porte sur la modélisation dynamique non linéaire de réducteurs à engrenages et de paliers à roulements fonctionnant sous charges et vitesses fortement variables. Par le développement de méthodes avancées de traitement cyclo-stationnaire du signal vibratoire et acoustique, la thèse permettra l'extraction de signatures précoces d'écaillage et de fissuration.",
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
      "Dans les ateliers flexibles fortement instrumentés, la planification de la production et les interventions de maintenance restent souvent décidées séparément. Cette thèse vise à fusionner des données multi-capteurs pour estimer la durée de vie résiduelle (RUL) des équipements critiques et à intégrer dynamiquement ces pronostics dans un modèle d'ordonnancement conjoint robuste aux pannes.",
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
      "Ce sujet doctoral s'attache à l'audit systémique, à la modélisation exergétique et au pilotage optimal en temps réel des procédés industriels énergivores. En couplant l'intégration thermique des rejets de chaleur fatale et le séquencement des lots selon la disponibilité d'énergies renouvelables sur site, la thèse réduira durablement la facture énergétique et l'empreinte carbone.",
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
      "La variabilité intrinsèque des matières premières agricoles complexifie la stabilisation de la qualité en transformation continue. Cette thèse développe des cartes de contrôle multivariées adaptatives alimentées par des mesures physico-chimiques et spectroscopiques en ligne, associées à un système de traçabilité fine par lot garantissant la conformité sanitaire et réglementaire.",
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
      "La filière oléicole de la région Fès-Meknès génère d'importants volumes de grignons et de margines riches en composés phénoliques antioxydants. Ce travail doctoral vise à optimiser des procédés d'éco-extraction sans solvants toxiques (ultrasons, fluides supercritiques et solvants eutectiques profonds), puis à stabiliser ces extraits par micro-encapsulation pour des applications alimentaires et cosmétiques.",
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
      "Cette thèse porte sur la formulation, la mise en forme et la caractérisation physico-mécanique de films d'emballage biodégradables élaborés à partir de polysaccharides et de protéines valorisés localement, enrichis en agents antimicrobiens naturels. Leur efficacité barrière à l'oxygène et à l'humidité sera validée sur l'allongement de la durée de conservation de denrées fraîches méditerranéennes.",
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
      "L'objectif de ce projet doctoral est d'isoler, caractériser et sélectionner un consortium de bactéries lactiques et levures autochtones issues de levains traditionnels marocains. La thèse étudiera la cinétique de fermentation dirigée afin de dégrader les facteurs antinutritionnels (phytates), d'accroître la biodisponibilité du fer et du zinc et d'optimiser les qualités sensorielles des produits céréaliers.",
    discipline: 'Bio-alimentaire',
    directeur: 'Pr. Mohammed Lahlou',
    directeurEmail: 'm.lahlou@usmba.ac.ma',
    laboratoire: 'LB2A',
    statut: 'Publié',
  },
];
