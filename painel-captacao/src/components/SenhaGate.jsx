import { useState } from 'react';

// Senha única e fixa pra segurar acesso casual ao link do site (não é segurança de verdade —
// fica visível em qualquer devtools — só uma primeira camada enquanto não existe login de
// verdade pra todo mundo; hoje só a aba "Acesso restrito" tem login, e é separado disso aqui).
// Trocar por algo mais forte depois é o próximo passo combinado com o usuário. De propósito
// não fica guardado em localStorage/sessionStorage: cada vez que a página é recarregada, pede
// a senha de novo.
const SENHA_ACESSO = '@aspar2026';

export default function SenhaGate({ children }) {
  const [liberado, setLiberado] = useState(false);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(false);

  if (liberado) return children;

  function entrar(e) {
    e.preventDefault();
    if (senha === SENHA_ACESSO) {
      setLiberado(true);
    } else {
      setErro(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Painel de Captação — CBMGO</h1>
        <p className="mt-1 text-sm text-slate-400">Acesso restrito. Digite a senha pra continuar.</p>
        <input
          type="password"
          autoFocus
          value={senha}
          onChange={(e) => {
            setSenha(e.target.value);
            setErro(false);
          }}
          className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-red-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          placeholder="Senha"
        />
        {erro && <p className="mt-2 text-xs text-red-600">Senha incorreta.</p>}
        <button type="submit" className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700">
          Entrar
        </button>
      </form>
    </div>
  );
}
