// Financing calculation utilities and bank data

export interface BankData {
  id: string;
  name: string;
  logo: string;
  interestRate: number; // Taxa anual em %
  maxFinancing: number; // % máximo financiado
  minDownPayment: number; // % mínimo de entrada
  maxTerm: number; // Prazo máximo em anos
  simulatorUrl: string;
  color: string; // Cor da marca para UI
}

// Dados dos principais bancos (taxas aproximadas - atualizar conforme mercado)
export const BANKS: BankData[] = [
  {
    id: "caixa",
    name: "Caixa Econômica Federal",
    logo: "https://logoeps.com/wp-content/uploads/2013/12/caixa-vector-logo.png",
    interestRate: 10.5, // % ao ano
    maxFinancing: 80,
    minDownPayment: 20,
    maxTerm: 35,
    simulatorUrl: "https://www8.caixa.gov.br/siopiinternet-web/simulaOperacaoInternet.do?method=inicializarCasoUso",
    color: "#0066CC"
  },
  {
    id: "bb",
    name: "Banco do Brasil",
    logo: "https://logoeps.com/wp-content/uploads/2013/12/banco-do-brasil-vector-logo.png",
    interestRate: 11.2,
    maxFinancing: 80,
    minDownPayment: 20,
    maxTerm: 35,
    simulatorUrl: "https://www.bb.com.br/site/pra-voce/financiamentos/",
    color: "#FFF100"
  },
  {
    id: "itau",
    name: "Itaú Unibanco",
    logo: "https://logoeps.com/wp-content/uploads/2013/12/itau-vector-logo.png",
    interestRate: 11.8,
    maxFinancing: 80,
    minDownPayment: 20,
    maxTerm: 35,
    simulatorUrl: "https://www.itau.com.br/emprestimos-financiamentos/credito-imobiliario",
    color: "#EC7000"
  },
  {
    id: "bradesco",
    name: "Bradesco",
    logo: "https://logoeps.com/wp-content/uploads/2013/12/bradesco-vector-logo.png",
    interestRate: 12.1,
    maxFinancing: 80,
    minDownPayment: 20,
    maxTerm: 35,
    simulatorUrl: "https://banco.bradesco/html/classic/produtos-servicos/emprestimo-e-financiamento/encontre-seu-credito/simuladores-imoveis.shtm",
    color: "#CC092F"
  },
  {
    id: "santander",
    name: "Santander",
    logo: "https://logoeps.com/wp-content/uploads/2013/12/santander-vector-logo.png",
    interestRate: 12.5,
    maxFinancing: 80,
    minDownPayment: 20,
    maxTerm: 35,
    simulatorUrl: "https://www.santander.com.br/banco/credito-financiamento-imobiliario",
    color: "#EC0000"
  }
];

export interface FinancingCalculation {
  monthlyPayment: number;
  downPayment: number;
  financedAmount: number;
  totalInterest: number;
  totalAmount: number;
}

// Cálculo usando Tabela Price (parcelas fixas)
export function calculateFinancing(
  propertyValue: number,
  downPaymentPercent: number,
  annualRate: number,
  termYears: number
): FinancingCalculation {
  const downPayment = propertyValue * (downPaymentPercent / 100);
  const financedAmount = propertyValue - downPayment;
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = termYears * 12;

  // Fórmula da Tabela Price: PMT = PV * [i(1+i)^n] / [(1+i)^n - 1]
  const monthlyPayment = financedAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
    (Math.pow(1 + monthlyRate, totalMonths) - 1);

  const totalAmount = monthlyPayment * totalMonths + downPayment;
  const totalInterest = totalAmount - propertyValue;

  return {
    monthlyPayment,
    downPayment,
    financedAmount,
    totalInterest,
    totalAmount
  };
}

// Encontra o menor valor de parcela entre os bancos
export function getLowestFinancing(propertyValue: number): {
  bank: BankData;
  calculation: FinancingCalculation;
} {
  let lowestPayment = Infinity;
  let bestBank = BANKS[0];
  let bestCalculation = calculateFinancing(
    propertyValue,
    bestBank.minDownPayment,
    bestBank.interestRate,
    bestBank.maxTerm
  );

  BANKS.forEach(bank => {
    const calculation = calculateFinancing(
      propertyValue,
      bank.minDownPayment,
      bank.interestRate,
      bank.maxTerm
    );

    if (calculation.monthlyPayment < lowestPayment) {
      lowestPayment = calculation.monthlyPayment;
      bestBank = bank;
      bestCalculation = calculation;
    }
  });

  return { bank: bestBank, calculation: bestCalculation };
}

// Calcula financiamento para todos os bancos
export function calculateAllBanks(propertyValue: number) {
  return BANKS.map(bank => ({
    bank,
    calculation: calculateFinancing(
      propertyValue,
      bank.minDownPayment,
      bank.interestRate,
      bank.maxTerm
    )
  }));
}
