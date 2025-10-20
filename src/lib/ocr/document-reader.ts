/**
 * OCR gratuito usando Tesseract.js
 * Extrai texto de documentos (CRECI, RG, CNH)
 * 100% client-side, sem custos
 */

import Tesseract from 'tesseract.js';

interface OCRResult {
  text: string;
  confidence: number;
  detectedCRECI?: string;
  detectedCPF?: string;
  detectedName?: string;
}

/**
 * Extrai texto de imagem usando OCR
 */
export async function extractTextFromImage(imageFile: File): Promise<OCRResult> {
  try {
    const { data } = await Tesseract.recognize(imageFile, 'por', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    // Procura por CRECI no texto
    const creciMatch = data.text.match(/CRECI[:\s-]*(\d{4,6}(-[FJ])?)/i);
    const detectedCRECI = creciMatch ? creciMatch[1] : undefined;

    // Procura por CPF no texto
    const cpfMatch = data.text.match(/CPF[:\s-]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i);
    const detectedCPF = cpfMatch ? cpfMatch[1].replace(/[^\d]/g, '') : undefined;

    return {
      text: data.text,
      confidence: data.confidence,
      detectedCRECI,
      detectedCPF,
    };
  } catch (error) {
    console.error('Erro no OCR:', error);
    return {
      text: '',
      confidence: 0,
    };
  }
}

/**
 * Valida se documento CRECI contém o número informado
 */
export async function validateCRECIDocument(
  imageFile: File,
  expectedCRECI: string
): Promise<{ valid: boolean; confidence: number; message?: string }> {
  try {
    const result = await extractTextFromImage(imageFile);
    
    // Remove formatação do CRECI esperado
    const cleanExpected = expectedCRECI.replace(/[^\d]/g, '');
    
    // Procura o número no texto extraído
    const found = result.text.includes(cleanExpected);
    
    return {
      valid: found,
      confidence: result.confidence,
      message: found 
        ? 'CRECI encontrado no documento' 
        : 'CRECI não encontrado no documento. Verifique manualmente.',
    };
  } catch (error) {
    return {
      valid: false,
      confidence: 0,
      message: 'Erro ao processar documento. Verificação manual necessária.',
    };
  }
}

/**
 * Extrai CPF de documento de identidade
 */
export async function extractCPFFromDocument(imageFile: File): Promise<string | null> {
  const result = await extractTextFromImage(imageFile);
  
  // Regex para encontrar CPF no texto
  const cpfRegex = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;
  const matches = result.text.match(cpfRegex);
  
  return matches ? matches[0] : null;
}

/**
 * Verifica se foto do documento é legível
 */
export function checkImageQuality(imageFile: File): Promise<{
  isGoodQuality: boolean;
  issues: string[];
}> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    
    img.onload = () => {
      const issues: string[] = [];
      
      // Verifica resolução mínima
      if (img.width < 800 || img.height < 600) {
        issues.push('Resolução muito baixa. Mínimo recomendado: 800x600px');
      }
      
      // Verifica tamanho do arquivo (muito pequeno = baixa qualidade)
      if (imageFile.size < 100000) { // 100KB
        issues.push('Arquivo muito pequeno. Pode estar com baixa qualidade.');
      }
      
      // Verifica tamanho do arquivo (muito grande = desnecessário)
      if (imageFile.size > 5000000) { // 5MB
        issues.push('Arquivo muito grande. Considere comprimir.');
      }
      
      URL.revokeObjectURL(url);
      
      resolve({
        isGoodQuality: issues.length === 0,
        issues,
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        isGoodQuality: false,
        issues: ['Erro ao carregar imagem'],
      });
    };
    
    img.src = url;
  });
}
