/**
 * Diccionario local de principios activos.
 *
 * Uso: (1) reconocer lo que escribe el usuario —nombre en español o inglés, marca o una errata—
 * y traducirlo a la consulta correcta para cada fuente; (2) agrupar principios activos por
 * grupo terapéutico para detectar interacciones descritas por grupo ("otros AINE",
 * "anticoagulantes orales"…).
 *
 * NO contiene información clínica: posología, efectos adversos, etc. se obtienen siempre de las
 * fichas técnicas oficiales. Las marcas sirven solo para orientar la búsqueda.
 */

export type ClassId =
  | 'aine'
  | 'antiagregante'
  | 'anticoagulante-cumarinico'
  | 'estatina'
  | 'macrolido-inhibidor-cyp3a4'
  | 'azol-inhibidor-cyp'
  | 'ieca'
  | 'ara2'
  | 'ahorrador-potasio'
  | 'diuretico-tiazida'
  | 'isrs'
  | 'imao'
  | 'ipde5'
  | 'nitrato'
  | 'ibp'
  | 'opioide'
  | 'benzodiacepina';

export interface DrugClass {
  id: ClassId;
  label: string;
  /** Términos con los que las fichas técnicas mencionan el grupo (es y en). */
  mentionTerms: string[];
}

export const DRUG_CLASSES: Record<ClassId, DrugClass> = {
  aine: {
    id: 'aine',
    label: 'Antiinflamatorios no esteroideos (AINE)',
    mentionTerms: ['aine', 'aines', 'antiinflamatorios no esteroideos', 'antiinflamatorio no esteroideo', 'nsaid', 'nsaids'],
  },
  antiagregante: {
    id: 'antiagregante',
    label: 'Antiagregantes plaquetarios',
    mentionTerms: ['antiagregantes', 'antiagregante', 'antiplaquetarios', 'antiplatelet', 'inhibidores de la agregacion plaquetaria'],
  },
  'anticoagulante-cumarinico': {
    id: 'anticoagulante-cumarinico',
    label: 'Anticoagulantes orales (antivitamina K)',
    mentionTerms: ['anticoagulantes', 'anticoagulante', 'anticoagulants', 'anticoagulant', 'cumarinicos', 'antivitamina k', 'antagonistas de la vitamina k'],
  },
  estatina: {
    id: 'estatina',
    label: 'Estatinas',
    mentionTerms: ['estatinas', 'estatina', 'statins', 'inhibidores de la hmg coa reductasa', 'hmg coa reductase inhibitors'],
  },
  'macrolido-inhibidor-cyp3a4': {
    id: 'macrolido-inhibidor-cyp3a4',
    label: 'Macrólidos inhibidores del CYP3A4',
    mentionTerms: ['inhibidores potentes del cyp3a4', 'inhibidores del cyp3a4', 'strong cyp3a4 inhibitors', 'macrolidos', 'macrolides'],
  },
  'azol-inhibidor-cyp': {
    id: 'azol-inhibidor-cyp',
    label: 'Antifúngicos azólicos',
    mentionTerms: ['antifungicos azolicos', 'azoles', 'azole antifungals', 'inhibidores del cyp2c9', 'inhibidores del cyp3a4'],
  },
  ieca: {
    id: 'ieca',
    label: 'Inhibidores de la ECA (IECA)',
    mentionTerms: ['ieca', 'inhibidores de la eca', 'inhibidores de la enzima convertidora de angiotensina', 'ace inhibitors', 'antihipertensivos'],
  },
  ara2: {
    id: 'ara2',
    label: 'Antagonistas del receptor de angiotensina II (ARA-II)',
    mentionTerms: ['ara ii', 'ara2', 'antagonistas de los receptores de angiotensina ii', 'antagonistas del receptor de angiotensina ii', 'angiotensin ii receptor blockers', 'arbs', 'antihipertensivos'],
  },
  'ahorrador-potasio': {
    id: 'ahorrador-potasio',
    label: 'Diuréticos ahorradores de potasio',
    mentionTerms: ['diureticos ahorradores de potasio', 'ahorradores de potasio', 'potassium sparing diuretics', 'suplementos de potasio'],
  },
  'diuretico-tiazida': {
    id: 'diuretico-tiazida',
    label: 'Diuréticos tiazídicos',
    mentionTerms: ['diureticos', 'diuretico', 'diuretics', 'tiazidas', 'thiazides'],
  },
  isrs: {
    id: 'isrs',
    label: 'Inhibidores selectivos de la recaptación de serotonina (ISRS)',
    mentionTerms: ['isrs', 'inhibidores selectivos de la recaptacion de serotonina', 'ssri', 'ssris', 'serotoninergicos', 'serotonergic drugs'],
  },
  imao: {
    id: 'imao',
    label: 'Inhibidores de la monoaminooxidasa (IMAO)',
    mentionTerms: ['imao', 'inhibidores de la monoaminooxidasa', 'maoi', 'maois', 'monoamine oxidase inhibitors'],
  },
  ipde5: {
    id: 'ipde5',
    label: 'Inhibidores de la fosfodiesterasa 5',
    mentionTerms: ['inhibidores de la pde5', 'inhibidores de la fosfodiesterasa 5', 'pde5 inhibitors'],
  },
  nitrato: {
    id: 'nitrato',
    label: 'Nitratos y donadores de óxido nítrico',
    mentionTerms: ['nitratos', 'nitrates', 'donadores de oxido nitrico', 'nitric oxide donors'],
  },
  ibp: {
    id: 'ibp',
    label: 'Inhibidores de la bomba de protones (IBP)',
    mentionTerms: ['inhibidores de la bomba de protones', 'ibp', 'proton pump inhibitors', 'ppis'],
  },
  opioide: {
    id: 'opioide',
    label: 'Analgésicos opioides',
    mentionTerms: ['opioides', 'opioide', 'opioids', 'opiaceos', 'analgesicos opioides'],
  },
  benzodiacepina: {
    id: 'benzodiacepina',
    label: 'Benzodiacepinas',
    mentionTerms: ['benzodiacepinas', 'benzodiazepinas', 'benzodiazepines', 'depresores del snc', 'cns depressants'],
  },
};

export interface IngredientEntry {
  /** Nombre canónico en español (DCI), con tildes. Es el que se envía a CIMA. */
  name: string;
  /** Nombres en inglés (INN/USAN). Se usan con openFDA y para leer fichas en inglés. */
  en: string[];
  /** Otras formas de escribirlo y marcas habituales (España, Latinoamérica, EE. UU.). */
  aliases?: string[];
  classes?: ClassId[];
}

export const INGREDIENTS: IngredientEntry[] = [
  // Analgésicos / AINE
  { name: 'paracetamol', en: ['acetaminophen', 'paracetamol'], aliases: ['gelocatil', 'termalgin', 'efferalgan', 'apiretal', 'tylenol', 'panadol', 'tempra', 'acetaminofen', 'acetaminofeno'] },
  { name: 'ibuprofeno', en: ['ibuprofen'], aliases: ['dalsy', 'espidifen', 'neobrufen', 'advil', 'motrin', 'nurofen'], classes: ['aine'] },
  { name: 'ácido acetilsalicílico', en: ['aspirin', 'acetylsalicylic acid'], aliases: ['aspirina', 'adiro', 'aas', 'tromalyt', 'bayaspirina'], classes: ['aine', 'antiagregante'] },
  { name: 'naproxeno', en: ['naproxen'], aliases: ['naprosyn', 'antalgin', 'aleve'], classes: ['aine'] },
  { name: 'diclofenaco', en: ['diclofenac'], aliases: ['voltaren', 'voltaren emulgel'], classes: ['aine'] },
  { name: 'dexketoprofeno', en: ['dexketoprofen'], aliases: ['enantyum'], classes: ['aine'] },
  { name: 'ketoprofeno', en: ['ketoprofen'], classes: ['aine'] },
  { name: 'meloxicam', en: ['meloxicam'], aliases: ['mobic'], classes: ['aine'] },
  { name: 'celecoxib', en: ['celecoxib'], aliases: ['celebrex'], classes: ['aine'] },
  { name: 'indometacina', en: ['indomethacin'], classes: ['aine'] },
  { name: 'metamizol', en: ['metamizole', 'dipyrone'], aliases: ['nolotil', 'dipirona', 'novalgina'] },
  { name: 'tramadol', en: ['tramadol'], aliases: ['adolonta', 'ultram'], classes: ['opioide'] },
  { name: 'tapentadol', en: ['tapentadol'], aliases: ['palexia'], classes: ['opioide'] },
  { name: 'morfina', en: ['morphine'], classes: ['opioide'] },
  { name: 'oxicodona', en: ['oxycodone'], aliases: ['oxycontin'], classes: ['opioide'] },
  { name: 'fentanilo', en: ['fentanyl'], aliases: ['durogesic'], classes: ['opioide'] },
  { name: 'codeína', en: ['codeine'], classes: ['opioide'] },
  { name: 'buprenorfina', en: ['buprenorphine'], classes: ['opioide'] },
  { name: 'metadona', en: ['methadone'], classes: ['opioide'] },

  // Antiagregantes / anticoagulantes
  { name: 'clopidogrel', en: ['clopidogrel'], aliases: ['plavix', 'iscover'], classes: ['antiagregante'] },
  { name: 'warfarina', en: ['warfarin'], aliases: ['aldocumar', 'coumadin'], classes: ['anticoagulante-cumarinico'] },
  { name: 'acenocumarol', en: ['acenocoumarol'], aliases: ['sintrom'], classes: ['anticoagulante-cumarinico'] },

  // Cardiovascular
  { name: 'atorvastatina', en: ['atorvastatin'], aliases: ['cardyl', 'zarator', 'lipitor'], classes: ['estatina'] },
  { name: 'simvastatina', en: ['simvastatin'], aliases: ['zocor'], classes: ['estatina'] },
  { name: 'lovastatina', en: ['lovastatin'], classes: ['estatina'] },
  { name: 'rosuvastatina', en: ['rosuvastatin'], aliases: ['crestor'], classes: ['estatina'] },
  { name: 'pravastatina', en: ['pravastatin'], classes: ['estatina'] },
  { name: 'enalapril', en: ['enalapril'], aliases: ['renitec', 'vasotec'], classes: ['ieca'] },
  { name: 'ramipril', en: ['ramipril'], aliases: ['acovil'], classes: ['ieca'] },
  { name: 'lisinopril', en: ['lisinopril'], aliases: ['zestril'], classes: ['ieca'] },
  { name: 'captopril', en: ['captopril'], classes: ['ieca'] },
  { name: 'perindopril', en: ['perindopril'], classes: ['ieca'] },
  { name: 'losartán', en: ['losartan'], aliases: ['cozaar'], classes: ['ara2'] },
  { name: 'valsartán', en: ['valsartan'], aliases: ['diovan'], classes: ['ara2'] },
  { name: 'candesartán', en: ['candesartan'], aliases: ['atacand'], classes: ['ara2'] },
  { name: 'olmesartán', en: ['olmesartan'], classes: ['ara2'] },
  { name: 'irbesartán', en: ['irbesartan'], aliases: ['aprovel'], classes: ['ara2'] },
  { name: 'telmisartán', en: ['telmisartan'], aliases: ['micardis'], classes: ['ara2'] },
  { name: 'espironolactona', en: ['spironolactone'], aliases: ['aldactone'], classes: ['ahorrador-potasio'] },
  { name: 'eplerenona', en: ['eplerenone'], classes: ['ahorrador-potasio'] },
  { name: 'amilorida', en: ['amiloride'], classes: ['ahorrador-potasio'] },
  { name: 'hidroclorotiazida', en: ['hydrochlorothiazide'], classes: ['diuretico-tiazida'] },
  { name: 'clortalidona', en: ['chlorthalidone'], classes: ['diuretico-tiazida'] },
  { name: 'indapamida', en: ['indapamide'], classes: ['diuretico-tiazida'] },
  { name: 'amiodarona', en: ['amiodarone'], aliases: ['trangorex'] },
  { name: 'nitroglicerina', en: ['nitroglycerin', 'glyceryl trinitrate'], aliases: ['trinitrina', 'solinitrina'], classes: ['nitrato'] },
  { name: 'mononitrato de isosorbida', en: ['isosorbide mononitrate'], aliases: ['uniket'], classes: ['nitrato'] },
  { name: 'dinitrato de isosorbida', en: ['isosorbide dinitrate'], classes: ['nitrato'] },
  { name: 'sildenafilo', en: ['sildenafil'], aliases: ['viagra'], classes: ['ipde5'] },
  { name: 'tadalafilo', en: ['tadalafil'], aliases: ['cialis'], classes: ['ipde5'] },
  { name: 'vardenafilo', en: ['vardenafil'], classes: ['ipde5'] },

  // Antiinfecciosos
  { name: 'amoxicilina', en: ['amoxicillin'], aliases: ['clamoxyl', 'augmentin', 'amoxil'] },
  { name: 'claritromicina', en: ['clarithromycin'], aliases: ['klacid', 'biaxin'], classes: ['macrolido-inhibidor-cyp3a4'] },
  { name: 'eritromicina', en: ['erythromycin'], classes: ['macrolido-inhibidor-cyp3a4'] },
  { name: 'azitromicina', en: ['azithromycin'], aliases: ['zitromax'] },
  { name: 'ciprofloxacino', en: ['ciprofloxacin'], aliases: ['cipro', 'ciprofloxacina'] },
  { name: 'fluconazol', en: ['fluconazole'], aliases: ['diflucan'], classes: ['azol-inhibidor-cyp'] },
  { name: 'linezolid', en: ['linezolid'], aliases: ['zyvoxid'], classes: ['imao'] },

  // Digestivo
  { name: 'omeprazol', en: ['omeprazole'], aliases: ['losec', 'prilosec'], classes: ['ibp'] },
  { name: 'esomeprazol', en: ['esomeprazole'], aliases: ['nexium'], classes: ['ibp'] },
  { name: 'pantoprazol', en: ['pantoprazole'], classes: ['ibp'] },
  { name: 'lansoprazol', en: ['lansoprazole'], classes: ['ibp'] },

  // Endocrino / metabolismo
  { name: 'metformina', en: ['metformin'], aliases: ['dianben', 'glucophage'] },
  { name: 'levotiroxina', en: ['levothyroxine'], aliases: ['eutirox', 'synthroid', 'levothroid'] },
  { name: 'alopurinol', en: ['allopurinol'], aliases: ['zyloric'] },
  { name: 'colchicina', en: ['colchicine'] },

  // Sistema nervioso
  { name: 'sertralina', en: ['sertraline'], aliases: ['besitran', 'zoloft'], classes: ['isrs'] },
  { name: 'fluoxetina', en: ['fluoxetine'], aliases: ['prozac'], classes: ['isrs'] },
  { name: 'paroxetina', en: ['paroxetine'], aliases: ['seroxat', 'paxil'], classes: ['isrs'] },
  { name: 'citalopram', en: ['citalopram'], classes: ['isrs'] },
  { name: 'escitalopram', en: ['escitalopram'], aliases: ['cipralex', 'esertia', 'lexapro'], classes: ['isrs'] },
  { name: 'moclobemida', en: ['moclobemide'], classes: ['imao'] },
  { name: 'selegilina', en: ['selegiline'], classes: ['imao'] },
  { name: 'rasagilina', en: ['rasagiline'], aliases: ['azilect'], classes: ['imao'] },
  { name: 'litio', en: ['lithium'], aliases: ['plenur', 'carbonato de litio'] },
  { name: 'tizanidina', en: ['tizanidine'], aliases: ['sirdalud'] },
  { name: 'diazepam', en: ['diazepam'], aliases: ['valium'], classes: ['benzodiacepina'] },
  { name: 'lorazepam', en: ['lorazepam'], aliases: ['orfidal', 'ativan'], classes: ['benzodiacepina'] },
  { name: 'alprazolam', en: ['alprazolam'], aliases: ['trankimazin', 'xanax'], classes: ['benzodiacepina'] },
  { name: 'clonazepam', en: ['clonazepam'], aliases: ['rivotril', 'klonopin'], classes: ['benzodiacepina'] },
  { name: 'bromazepam', en: ['bromazepam'], aliases: ['lexatin'], classes: ['benzodiacepina'] },
  { name: 'lormetazepam', en: ['lormetazepam'], aliases: ['noctamid'], classes: ['benzodiacepina'] },

  // Inmunosupresores / otros
  { name: 'metotrexato', en: ['methotrexate'] },
  { name: 'azatioprina', en: ['azathioprine'], aliases: ['imurel'] },
  { name: 'mercaptopurina', en: ['mercaptopurine'] },

  // Respiratorio / alergia
  { name: 'salbutamol', en: ['albuterol', 'salbutamol'], aliases: ['ventolin', 'ventolín'] },
  { name: 'loratadina', en: ['loratadine'], aliases: ['claritin', 'clarityne'] },
  { name: 'cetirizina', en: ['cetirizine'], aliases: ['zyrtec', 'alerlisin'] },
];
