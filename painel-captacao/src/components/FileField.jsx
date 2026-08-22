import { useRef } from 'react';
import { LuPaperclip, LuX, LuFileText, LuImage } from 'react-icons/lu';

const MAX_ARQUIVOS = 4;
const MAX_BYTES_POR_ARQUIVO = 4 * 1024 * 1024; // 4MB — o envio passa por uma function serverless
// (Netlify Functions), que tem limite de payload por requisição; ficar bem abaixo disso evita
// falha silenciosa no upload. Comprima fotos grandes antes de anexar se passar do limite.

function fileParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // já vem como data URL "data:<mime>;base64,...."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fmtBytes(n) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}

/** Upload de documentos/fotos: converte pra base64 no navegador (sem servidor de upload próprio)
 * e entrega ao formulário; quem persiste de fato é a function serverless no envio do cadastro. */
export default function FileField({ anexos, onChange, error }) {
  const inputRef = useRef(null);

  async function adicionar(fileList) {
    const restantes = MAX_ARQUIVOS - anexos.length;
    const arquivos = Array.from(fileList).slice(0, Math.max(0, restantes));
    const novos = [];
    for (const file of arquivos) {
      if (file.size > MAX_BYTES_POR_ARQUIVO) {
        alert(`"${file.name}" tem ${fmtBytes(file.size)} — o limite por arquivo é ${fmtBytes(MAX_BYTES_POR_ARQUIVO)}.`);
        continue;
      }
      const dataUrl = await fileParaBase64(file);
      novos.push({ nome: file.name, tipo: file.type, tamanho: file.size, dataUrl });
    }
    if (novos.length) onChange([...anexos, ...novos]);
  }

  function remover(i) {
    onChange(anexos.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {anexos.map((a, i) => (
          <div key={`${a.nome}-${i}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900">
            {a.tipo?.startsWith('image/') ? <LuImage className="h-3.5 w-3.5 text-slate-400" /> : <LuFileText className="h-3.5 w-3.5 text-slate-400" />}
            <span className="max-w-[140px] truncate text-slate-600 dark:text-slate-300">{a.nome}</span>
            <span className="text-slate-400">{fmtBytes(a.tamanho)}</span>
            <button type="button" onClick={() => remover(i)} className="text-slate-400 hover:text-red-600">
              <LuX className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {anexos.length < MAX_ARQUIVOS && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-400"
        >
          <LuPaperclip className="h-3.5 w-3.5" /> Anexar documentos ou fotos ({anexos.length}/{MAX_ARQUIVOS}, até {fmtBytes(MAX_BYTES_POR_ARQUIVO)} cada)
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => { adicionar(e.target.files); e.target.value = ''; }}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
