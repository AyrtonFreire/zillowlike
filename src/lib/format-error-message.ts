/**
 * Traduz erros técnicos em mensagens claras para usuários não-tech.
 * Usar em catch de fetch/async para dar contexto melhor que "Não conseguimos carregar".
 */
export function formatErrorMessage(err: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (typeof err === "string" && err.trim().length > 0) {
    return err;
  }

  if (err instanceof Error) {
    const msg = err.message || "";
    const lower = msg.toLowerCase();

    if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request failed")) {
      return "Sem conexão. Verifique sua internet e tente novamente.";
    }
    if (lower.includes("aborted") || err.name === "AbortError") {
      return "A operação demorou demais. Tente novamente.";
    }
    if (lower.includes("403") || lower.includes("unauthorized") || lower.includes("forbidden")) {
      return "Você não tem permissão para essa ação.";
    }
    if (lower.includes("401")) {
      return "Sua sessão expirou. Faça login novamente.";
    }
    if (lower.includes("404") || lower.includes("not found")) {
      return "Não encontramos o que você procurava.";
    }
    if (lower.includes("409") || lower.includes("conflict")) {
      return "Esse item já existe ou está em uso.";
    }
    if (lower.includes("429") || lower.includes("rate limit")) {
      return "Muitas tentativas em pouco tempo. Aguarde um momento.";
    }
    if (lower.includes("500") || lower.includes("502") || lower.includes("503") || lower.includes("internal")) {
      return "Nosso servidor teve um problema. Tente de novo em alguns segundos.";
    }

    if (msg && msg.length > 0 && msg.length <= 160) {
      return msg;
    }
  }

  return fallback;
}
