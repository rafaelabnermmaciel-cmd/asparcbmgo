// Preencha com os valores do SEU serviço no EmailJS (emailjs.com) — ver SETUP.md, seção
// "Notificação por e-mail". Como o Supabase, isso é uma chave feita pra ficar visível no
// código do site (é o modelo do EmailJS pra apps sem servidor); o limite de abuso é
// controlado pelas "Allowed origins" que você configura na conta EmailJS, não pelo sigilo
// da chave.
export const EMAILJS_SERVICE_ID = 'service_slylwwe';
export const EMAILJS_TEMPLATE_ID = 'COLE_AQUI_O_TEMPLATE_ID';
export const EMAILJS_PUBLIC_KEY = 'JPPAC4UPgx14PRSZ7';

// Template separado (mesmo Service ID e Public Key acima) pro aviso de "alguém pediu acesso à
// Gerenciamento" — ver SETUP.md, seção 7.6.
export const EMAILJS_TEMPLATE_ID_ACESSO = 'template_v8rhhei';

// Pra onde a notificação é enviada a cada novo cadastro. Se um dia precisar trocar, é só
// mudar aqui (não precisa mexer no template do EmailJS, que usa {{to_email}}).
export const EMAIL_NOTIFICACAO_PARA = 'asparcbmgo@gmail.com';
