import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth } from "./layout/RequireAuth";
import { AppLayout } from "./layout/AppLayout";
import { Login } from "./pages/auth/Login";
import { SignupEmpresa } from "./pages/auth/SignupEmpresa";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { ResetPassword } from "./pages/auth/ResetPassword";
import { VisaoGeral } from "./pages/dashboard/VisaoGeral";
import { UsuariosPage } from "./pages/usuarios/UsuariosPage";
import { MinhaEmpresa } from "./pages/empresa/MinhaEmpresa";
import { ProdutosPage } from "./pages/produtos/ProdutosPage";
import { EstoquePage } from "./pages/estoque/EstoquePage";
import { PDVPage } from "./pages/pdv/PDVPage";
import { CaixaPage } from "./pages/caixa/CaixaPage";
import { ClientesPage } from "./pages/clientes/ClientesPage";
import { RelatoriosPage } from "./pages/relatorios/RelatoriosPage";
import { AuditoriaPage } from "./pages/auditoria/AuditoriaPage";
import { ConfiguracoesPage } from "./pages/configuracoes/ConfiguracoesPage";
import { RequireRole } from "./layout/RequireRole";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro-empresa" element={<SignupEmpresa />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<VisaoGeral />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/minha-empresa" element={<MinhaEmpresa />} />
              <Route path="/pdv" element={<PDVPage />} />
              <Route path="/produtos" element={<ProdutosPage />} />
              <Route path="/estoque" element={<EstoquePage />} />
              <Route path="/caixa" element={<CaixaPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route
                path="/relatorios"
                element={
                  <RequireRole roles={["ADMIN", "GERENTE"]}>
                    <RelatoriosPage />
                  </RequireRole>
                }
              />
              <Route
                path="/auditoria"
                element={
                  <RequireRole roles={["ADMIN"]}>
                    <AuditoriaPage />
                  </RequireRole>
                }
              />
              <Route
                path="/configuracoes"
                element={
                  <RequireRole roles={["ADMIN"]}>
                    <ConfiguracoesPage />
                  </RequireRole>
                }
              />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
