import type { Role } from "../types/auth";

export type NavItem = {
  to: string;
  label: string;
  available: boolean;
  roles?: Role[];
};

// Os 11 itens do menu principal. `available: false` = módulo ainda não construído
// nesta etapa (aparece na sidebar mas leva a uma página "Em construção").
export const navItems: NavItem[] = [
  { to: "/", label: "Visão geral", available: true },
  { to: "/pdv", label: "PDV / Vendas", available: true },
  { to: "/produtos", label: "Produtos", available: true },
  { to: "/estoque", label: "Estoque", available: true },
  { to: "/caixa", label: "Caixa", available: true },
  { to: "/clientes", label: "Clientes", available: true },
  {
    to: "/relatorios",
    label: "Relatórios",
    available: true,
    roles: ["ADMIN", "GERENTE"],
  },
  { to: "/usuarios", label: "Usuários e permissões", available: true, roles: ["ADMIN"] },
  { to: "/auditoria", label: "Auditoria", available: true, roles: ["ADMIN"] },
  { to: "/configuracoes", label: "Configurações", available: true, roles: ["ADMIN"] },
  { to: "/minha-empresa", label: "Minha empresa", available: true },
];
