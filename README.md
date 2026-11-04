# Amigo X da SEMAM

Sorteador de amigo oculto com envio pelo WhatsApp, feito para a confraternização de fim de ano da Secretaria Municipal de Meio Ambiente de Fundão (ES).

**Página pública:** https://fellipecramos.github.io/amigox/

## Como funciona

1. **Cadastro** — nome, WhatsApp e sugestão de presente de cada participante (dá para colar a lista inteira de uma planilha).
2. **Regras** — duplas que não podem se tirar (casais, chefias) e a opção *roda única*, em que a revelação passa por todo mundo numa roda só.
3. **Sorteio** — feito no navegador com `crypto.getRandomValues`. Nada vai para servidor nenhum.
4. **Mensagem** — cada pessoa recebe no WhatsApp um link que abre **só o próprio papelzinho**. O nome sorteado nunca aparece no texto da mensagem: vai codificado no link, e o painel nunca mostra quem tirou quem.
5. **Envio** — três jeitos:
   - um clique por pessoa (o WhatsApp abre com o texto pronto);
   - automático com o Claude no Chrome, com o WhatsApp Web logado;
   - automático com o script `enviar/enviar.js` (Node + Baileys), sem precisar de ninguém.

## Estrutura

| Arquivo | O que é |
| --- | --- |
| `index.html` | O sistema inteiro: painel do organizador e página de revelação, num arquivo só, sem dependências além das fontes. |
| `preview.jpg` | Arte que o WhatsApp mostra como cartão da mensagem (criada no Canva). |
| `logo.png` | Opcional. Se existir, aparece na faixa institucional e na página de revelação. |
| `enviar/` | Script de envio automático. Veja abaixo. |

## Envio automático com o script

Pré-requisito: [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
cd enviar
npm install
# exporte a fila no passo 5 do sorteador e salve o fila-amigox-XXXX.json nesta pasta
node enviar.js --simular              # mostra o que seria enviado, sem conectar
node enviar.js --teste 27999990000    # manda a primeira mensagem só para esse número
node enviar.js                        # envia as pendentes, com pausa entre elas
node enviar.js --sair                 # desconecta este computador do WhatsApp
```

Na primeira vez aparece um QR code: WhatsApp > Dispositivos conectados > Conectar dispositivo. A sessão fica em `enviar/auth-amigox/` (não vai para o Git); apague com `--sair` quando terminar.

**Aviso:** o Baileys não é uma biblioteca oficial do WhatsApp. Para poucas dezenas de mensagens a contatos que já têm o seu número, o risco de bloqueio é baixo, mas não é zero. Não use para disparos em massa.

## Privacidade

- Nomes e números ficam só no navegador de quem organiza (`localStorage`). O arquivo de backup é a única cópia que sai dali, e só quando você baixa.
- O link de cada participante carrega o resultado codificado. Quem tem o link consegue abri-lo, como quem segura um papelzinho de papel consegue desdobrá-lo; o sistema só garante que ninguém vê o resultado **sem querer**.
- A página pública não usa cookies, analytics nem servidor próprio: é um arquivo estático no GitHub Pages.

## Desenvolvimento

`index.html` é gerado a partir de `app.html` (versão sem `<html>/<head>`, usada como artefato no Claude) por um script de build que acrescenta as metas Open Graph. Para editar, altere `app.html` e regenere, ou edite `index.html` diretamente.

---

Sistema desenvolvido por **Fellipe Caldeira Ramos** · SEMAM Fundão · 2026
