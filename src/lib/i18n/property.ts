export const ptBR = {
  type: (t?: string) => (
    t === 'HOUSE' ? 'Casa' :
    t === 'APARTMENT' ? 'Apartamento' :
    t === 'CONDO' ? 'Condomínio' :
    t === 'TOWNHOUSE' ? 'Sobrado' :
    t === 'STUDIO' ? 'Studio' :
    t === 'LAND' ? 'Terreno' :
    t === 'RURAL' ? 'Imóvel rural' :
    t === 'COMMERCIAL' ? 'Comercial' : 'Imóvel'
  ),
  purpose: (p?: string) => (p === 'RENT' ? 'Aluguel' : p === 'SALE' ? 'Venda' : ''),
  finishFloor: (v?: string | null) => (
    v === 'PORCELANATO' ? 'Porcelanato' :
    v === 'CERAMICA' ? 'Cerâmica' :
    v === 'MADEIRA' ? 'Madeira' :
    v === 'VINILICO' ? 'Vinílico' :
    v ? 'Outro' : ''
  ),
  sunOrientation: (v?: string | null) => (
    v === 'NASCENTE' ? 'Nascente' :
    v === 'POENTE' ? 'Poente' :
    v ? 'Outra' : ''
  ),
  amenityLabel: (key: string) => ({
    hasBalcony: 'Varanda',
    hasElevator: 'Elevador',
    hasPool: 'Piscina',
    hasGym: 'Academia',
    hasPlayground: 'Playground',
    hasPartyRoom: 'Salão de festas',
    hasGourmet: 'Espaço gourmet',
    hasConcierge24h: 'Portaria 24h',
    accRamps: 'Rampas de acesso',
    accWideDoors: 'Portas largas',
    accAccessibleElevator: 'Elevador acessível',
    accTactile: 'Piso tátil',
    comfortAC: 'Ar-condicionado',
    comfortHeating: 'Aquecimento',
    comfortSolar: 'Energia solar',
    comfortNoiseWindows: 'Janelas antirruído',
    comfortLED: 'Iluminação LED',
    comfortWaterReuse: 'Reuso de água',
    finishCabinets: 'Armários planejados',
    finishCounterGranite: 'Bancada em granito',
    finishCounterQuartz: 'Bancada em quartzo',
    viewSea: 'Vista para o mar',
    viewCity: 'Vista para a cidade',
    viewRiver: 'Vista para o rio',
    viewLake: 'Vista para o lago',
    positionFront: 'Vista para o rio',
    positionBack: 'Vista para o lago',
    petsSmall: 'Aceita pets pequenos',
    petsLarge: 'Aceita pets grandes',
  } as Record<string,string>)[key] || key,
};

export function amenitiesFromProperty(p: any): string[] {
  const hasViewRiver = !!p?.viewRiver || !!p?.positionFront;
  const hasViewLake = !!p?.viewLake || !!p?.positionBack;
  const keys = [
    'hasBalcony','hasElevator','hasPool','hasGym','hasPlayground','hasPartyRoom','hasGourmet','hasConcierge24h',
    'accRamps','accWideDoors','accAccessibleElevator','accTactile',
    'comfortAC','comfortHeating','comfortSolar','comfortNoiseWindows','comfortLED','comfortWaterReuse',
    'finishCabinets','finishCounterGranite','finishCounterQuartz',
    'viewSea','viewCity','viewRiver','viewLake',
    'petsSmall','petsLarge'
  ];
  return keys
    .filter((k) => {
      if (k === 'viewRiver') return hasViewRiver;
      if (k === 'viewLake') return hasViewLake;
      return !!p?.[k];
    })
    .map((k) => ptBR.amenityLabel(k));
}
