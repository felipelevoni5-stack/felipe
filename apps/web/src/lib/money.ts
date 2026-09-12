// Toda soma/comparação de valores em reais no PDV passa por centavos inteiros.
// Aritmética de ponto flutuante direta (ex.: 9.9 * 3 - 1) gera resíduos como
// 28.700000000000003, que quebram comparações "total pago === total da venda".
export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}
