import type { InteractionSeverity } from '@/domain/types';
import type { ClassId } from './ingredients';

/**
 * Interacciones clínicamente relevantes y ampliamente documentadas en las fichas técnicas
 * (sección 4.5) y guías de referencia. Aportan la GRAVEDAD, que el texto libre de las fichas
 * no permite clasificar de forma automática y fiable.
 *
 * Criterios de inclusión:
 *  - Descrita expresamente en la ficha técnica de al menos uno de los fármacos.
 *  - Gravedad asignada de forma conservadora según el texto de la ficha
 *    ("contraindicado" → contraindicada; "no se recomienda / evitar" → grave;
 *     "precaución / vigilar" → moderada; "separar tomas" → leve).
 *
 * Esta tabla NO es exhaustiva: la app complementa siempre con la búsqueda de menciones en
 * las fichas técnicas y lo indica al usuario. Toda modificación debe revisarla un profesional
 * sanitario (ver docs/ARQUITECTURA.md, "Gobierno de datos").
 */

/** Un lado de la interacción: un principio activo concreto (nombre canónico) o un grupo. */
export type Party = { ingredient: string } | { class: ClassId };

export interface CuratedInteraction {
  a: Party;
  b: Party;
  severity: Exclude<InteractionSeverity, 'desconocida'>;
  summary: string;
  management: string;
}

const ing = (name: string): Party => ({ ingredient: name });
const cls = (id: ClassId): Party => ({ class: id });

export const CURATED_INTERACTIONS: CuratedInteraction[] = [
  // ——— Contraindicadas ———
  {
    a: cls('ipde5'),
    b: cls('nitrato'),
    severity: 'contraindicada',
    summary: 'Potencian el efecto hipotensor de los nitratos y pueden causar una bajada grave de la tensión arterial.',
    management: 'No deben utilizarse juntos.',
  },
  {
    a: cls('isrs'),
    b: cls('imao'),
    severity: 'contraindicada',
    summary: 'Riesgo de síndrome serotoninérgico, potencialmente mortal.',
    management: 'No combinar. Respetar los periodos de lavado indicados en la ficha técnica al cambiar de uno a otro.',
  },
  {
    a: ing('simvastatina'),
    b: cls('macrolido-inhibidor-cyp3a4'),
    severity: 'contraindicada',
    summary: 'Aumentan mucho la concentración de simvastatina: riesgo de miopatía y rabdomiólisis.',
    management: 'No combinar. Si el antibiótico es imprescindible, suspender la simvastatina durante el tratamiento.',
  },
  {
    a: ing('lovastatina'),
    b: cls('macrolido-inhibidor-cyp3a4'),
    severity: 'contraindicada',
    summary: 'Aumentan mucho la concentración de lovastatina: riesgo de miopatía y rabdomiólisis.',
    management: 'No combinar. Suspender la estatina durante el tratamiento antibiótico.',
  },
  {
    a: ing('tizanidina'),
    b: ing('ciprofloxacino'),
    severity: 'contraindicada',
    summary: 'El ciprofloxacino aumenta mucho los niveles de tizanidina: hipotensión y sedación intensas.',
    management: 'No deben utilizarse juntos.',
  },

  // ——— Graves ———
  {
    a: cls('anticoagulante-cumarinico'),
    b: cls('aine'),
    severity: 'grave',
    summary: 'Aumenta el riesgo de hemorragia, especialmente digestiva.',
    management: 'Evitar si es posible. Si se usan juntos, requiere control médico estrecho (INR y signos de sangrado).',
  },
  {
    a: cls('anticoagulante-cumarinico'),
    b: cls('macrolido-inhibidor-cyp3a4'),
    severity: 'grave',
    summary: 'Puede aumentar el efecto anticoagulante (INR) y el riesgo de hemorragia.',
    management: 'Controlar el INR al iniciar y al finalizar el antibiótico; puede requerir ajuste de dosis.',
  },
  {
    a: cls('anticoagulante-cumarinico'),
    b: ing('fluconazol'),
    severity: 'grave',
    summary: 'El fluconazol aumenta el efecto anticoagulante y el riesgo de hemorragia.',
    management: 'Controlar el INR estrechamente; puede requerir reducir la dosis del anticoagulante.',
  },
  {
    a: cls('anticoagulante-cumarinico'),
    b: ing('amiodarona'),
    severity: 'grave',
    summary: 'La amiodarona aumenta el efecto anticoagulante; el efecto puede persistir meses tras suspenderla.',
    management: 'Controlar el INR con frecuencia y ajustar la dosis del anticoagulante.',
  },
  {
    a: ing('atorvastatina'),
    b: cls('macrolido-inhibidor-cyp3a4'),
    severity: 'grave',
    summary: 'Aumenta la concentración de atorvastatina y el riesgo de miopatía.',
    management: 'Evitar la combinación o usar la menor dosis de atorvastatina indicada en la ficha técnica, con vigilancia de dolor muscular.',
  },
  {
    a: ing('simvastatina'),
    b: ing('amiodarona'),
    severity: 'grave',
    summary: 'Aumenta el riesgo de miopatía y rabdomiólisis.',
    management: 'No superar la dosis máxima de simvastatina indicada en la ficha técnica para esta combinación.',
  },
  {
    a: cls('ieca'),
    b: cls('ara2'),
    severity: 'grave',
    summary: 'El doble bloqueo del sistema renina-angiotensina aumenta el riesgo de hipotensión, hiperpotasemia e insuficiencia renal.',
    management: 'No se recomienda. Solo bajo supervisión de un especialista con control de función renal, potasio y tensión.',
  },
  {
    a: cls('opioide'),
    b: cls('benzodiacepina'),
    severity: 'grave',
    summary: 'Sedación profunda, depresión respiratoria, coma y muerte.',
    management: 'Reservar para cuando no haya alternativas; dosis mínimas, duración mínima y vigilancia.',
  },
  {
    a: ing('metotrexato'),
    b: cls('aine'),
    severity: 'grave',
    summary: 'Los AINE pueden reducir la eliminación del metotrexato y aumentar su toxicidad.',
    management: 'Evitar, sobre todo con dosis altas de metotrexato. Requiere control médico y analítico.',
  },
  {
    a: ing('alopurinol'),
    b: ing('azatioprina'),
    severity: 'grave',
    summary: 'El alopurinol aumenta mucho la toxicidad de la azatioprina (mielosupresión).',
    management: 'Requiere reducir la dosis de azatioprina según la ficha técnica y controlar el hemograma.',
  },
  {
    a: ing('alopurinol'),
    b: ing('mercaptopurina'),
    severity: 'grave',
    summary: 'El alopurinol aumenta mucho la toxicidad de la mercaptopurina (mielosupresión).',
    management: 'Requiere reducir la dosis de mercaptopurina según la ficha técnica y controlar el hemograma.',
  },
  {
    a: ing('colchicina'),
    b: cls('macrolido-inhibidor-cyp3a4'),
    severity: 'grave',
    summary: 'Aumenta la concentración de colchicina: riesgo de toxicidad grave.',
    management: 'Evitar; contraindicado en pacientes con insuficiencia renal o hepática.',
  },
  {
    a: ing('litio'),
    b: cls('aine'),
    severity: 'grave',
    summary: 'Los AINE pueden aumentar los niveles de litio hasta valores tóxicos.',
    management: 'Evitar o controlar litemia estrechamente.',
  },
  {
    a: ing('litio'),
    b: cls('ieca'),
    severity: 'grave',
    summary: 'Aumentan los niveles de litio con riesgo de toxicidad.',
    management: 'Evitar o controlar litemia estrechamente.',
  },
  {
    a: ing('litio'),
    b: cls('ara2'),
    severity: 'grave',
    summary: 'Aumentan los niveles de litio con riesgo de toxicidad.',
    management: 'Evitar o controlar litemia estrechamente.',
  },
  {
    a: ing('litio'),
    b: cls('diuretico-tiazida'),
    severity: 'grave',
    summary: 'Las tiazidas reducen la eliminación de litio: riesgo de toxicidad.',
    management: 'Evitar o controlar litemia estrechamente.',
  },

  // ——— Moderadas ———
  {
    a: cls('isrs'),
    b: cls('aine'),
    severity: 'moderada',
    summary: 'Aumenta el riesgo de hemorragia, sobre todo digestiva.',
    management: 'Usar con precaución; valorar protección gástrica en pacientes de riesgo.',
  },
  {
    a: cls('isrs'),
    b: cls('anticoagulante-cumarinico'),
    severity: 'moderada',
    summary: 'Aumenta el riesgo de hemorragia.',
    management: 'Vigilar signos de sangrado y el INR al iniciar o suspender el antidepresivo.',
  },
  {
    a: cls('isrs'),
    b: ing('tramadol'),
    severity: 'moderada',
    summary: 'Riesgo de síndrome serotoninérgico y de convulsiones.',
    management: 'Usar con precaución y vigilar síntomas (agitación, temblor, fiebre, diarrea).',
  },
  {
    a: ing('ibuprofeno'),
    b: ing('ácido acetilsalicílico'),
    severity: 'moderada',
    summary: 'El ibuprofeno puede reducir el efecto antiagregante del ácido acetilsalicílico a dosis bajas y suma riesgo digestivo.',
    management: 'No se recomienda el uso continuado conjunto. Si se toma ocasionalmente, consultar la separación de tomas en la ficha técnica.',
  },
  {
    a: cls('aine'),
    b: cls('ieca'),
    severity: 'moderada',
    summary: 'Los AINE reducen el efecto antihipertensivo y aumentan el riesgo de daño renal.',
    management: 'Usar con precaución, asegurar buena hidratación y controlar la función renal.',
  },
  {
    a: cls('aine'),
    b: cls('ara2'),
    severity: 'moderada',
    summary: 'Los AINE reducen el efecto antihipertensivo y aumentan el riesgo de daño renal.',
    management: 'Usar con precaución, asegurar buena hidratación y controlar la función renal.',
  },
  {
    a: cls('ieca'),
    b: cls('ahorrador-potasio'),
    severity: 'moderada',
    summary: 'Riesgo de hiperpotasemia (potasio alto en sangre).',
    management: 'Controlar el potasio y la función renal.',
  },
  {
    a: cls('ara2'),
    b: cls('ahorrador-potasio'),
    severity: 'moderada',
    summary: 'Riesgo de hiperpotasemia (potasio alto en sangre).',
    management: 'Controlar el potasio y la función renal.',
  },
  {
    a: ing('clopidogrel'),
    b: ing('omeprazol'),
    severity: 'moderada',
    summary: 'El omeprazol reduce la activación del clopidogrel y puede disminuir su eficacia.',
    management: 'Se desaconseja la combinación; consultar alternativas de protección gástrica.',
  },
  {
    a: ing('clopidogrel'),
    b: ing('esomeprazol'),
    severity: 'moderada',
    summary: 'El esomeprazol reduce la activación del clopidogrel y puede disminuir su eficacia.',
    management: 'Se desaconseja la combinación; consultar alternativas de protección gástrica.',
  },
  {
    a: cls('anticoagulante-cumarinico'),
    b: ing('paracetamol'),
    severity: 'moderada',
    summary: 'El uso regular de dosis altas de paracetamol puede aumentar el INR.',
    management: 'Uso ocasional aceptable; si se toma de forma continuada, controlar el INR.',
  },
  {
    a: cls('anticoagulante-cumarinico'),
    b: ing('levotiroxina'),
    severity: 'moderada',
    summary: 'La levotiroxina puede potenciar el efecto anticoagulante.',
    management: 'Controlar el INR al iniciar o ajustar la levotiroxina.',
  },

  // ——— Leves ———
  {
    a: ing('levotiroxina'),
    b: cls('ibp'),
    severity: 'leve',
    summary: 'Los IBP pueden reducir la absorción de levotiroxina.',
    management: 'Controlar la función tiroidea (TSH) si se inicia o suspende el IBP.',
  },
];
