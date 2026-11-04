#!/usr/bin/env node
/*
  Amigo X · envio automático pelo WhatsApp
  ----------------------------------------
  Lê a fila exportada pelo sorteador (fila-amigox-XXXX.json), conecta ao WhatsApp
  pelo protocolo do WhatsApp Web (biblioteca Baileys) e envia uma mensagem por pessoa,
  com pausa aleatória entre elas. O progresso é gravado de volta no JSON, então dá
  para parar e continuar de onde parou.

  Uso:
    node enviar.js                       -> envia as mensagens pendentes de fila-amigox*.json
    node enviar.js fila-amigox-AB12.json -> arquivo específico
    node enviar.js --simular             -> mostra o que seria enviado, sem conectar
    node enviar.js --teste 27999990000   -> envia só a primeira mensagem para ESSE número (teste)
    node enviar.js --sair                -> desconecta este computador do WhatsApp (apaga a sessão)

  Aviso: Baileys não é uma biblioteca oficial do WhatsApp. Para poucas dezenas de
  mensagens a contatos que já têm o seu número, o risco de bloqueio é baixo, mas não
  é zero. Teste primeiro com o seu próprio número e não use para disparos em massa.
*/
'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const flagValue = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const SIMULAR = flag('--simular') || flag('--dry-run');
const TESTE = flag('--teste') ? (flagValue('--teste') || '') : null;
const SAIR = flag('--sair');
const AUTH_DIR = path.join(__dirname, 'auth-amigox');
const PAUSA_MIN = 6000, PAUSA_MAX = 14000; // ms entre mensagens
const MAX_TENTATIVAS = 8;
let tentativas = 0;

function log(msg) { console.log(new Date().toLocaleTimeString('pt-BR') + '  ' + msg); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pausa = () => PAUSA_MIN + Math.floor(Math.random() * (PAUSA_MAX - PAUSA_MIN));

function acharFila() {
  const explicit = args.find((a) => a.endsWith('.json'));
  if (explicit) return path.resolve(explicit);
  const candidatos = fs.readdirSync(process.cwd()).filter((f) => /^fila-amigox.*\.json$/i.test(f)).sort();
  if (candidatos.length === 1) return path.resolve(candidatos[0]);
  if (candidatos.length > 1) {
    console.error('Há mais de uma fila nesta pasta. Diga qual usar: node enviar.js ' + candidatos[0]);
    process.exit(1);
  }
  console.error('Não achei nenhum fila-amigox-XXXX.json nesta pasta. Exporte a fila no passo 5 do sorteador e salve aqui.');
  process.exit(1);
}

function normalizar(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  if (!d) return null;
  return d;
}

if (SAIR) {
  if (fs.existsSync(AUTH_DIR)) { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); log('Sessão apagada. Em Dispositivos conectados do WhatsApp, remova também o aparelho "Baileys/Chrome".'); }
  else log('Não havia sessão salva.');
  process.exit(0);
}

const filaPath = acharFila();
let fila;
try { fila = JSON.parse(fs.readFileSync(filaPath, 'utf8')); } catch (e) { console.error('Não consegui ler ' + filaPath + ': ' + e.message); process.exit(1); }
if (!fila || fila.app !== 'amigox' || !Array.isArray(fila.mensagens)) { console.error('Esse arquivo não é uma fila do Amigo X.'); process.exit(1); }

let pendentes = fila.mensagens.filter((m) => m.status !== 'enviada');
if (TESTE !== null) {
  const tel = normalizar(TESTE);
  if (!tel) { console.error('Informe o número de teste: node enviar.js --teste 27999990000'); process.exit(1); }
  const base = fila.mensagens[0];
  pendentes = [{ id: 'teste', nome: base.nome + ' (TESTE)', telefone: tel.length <= 11 ? '55' + tel : tel, mensagem: base.mensagem }];
}

log('Fila: ' + path.basename(filaPath) + (fila.sorteio ? ' · sorteio #' + fila.sorteio : '') + ' · ' + fila.mensagens.length + ' mensagens, ' + pendentes.length + ' para enviar' + (TESTE !== null ? ' (modo teste)' : ''));
if (!pendentes.length) { log('Nada pendente. Tudo já foi enviado.'); process.exit(0); }

if (SIMULAR) {
  pendentes.forEach((m, i) => {
    console.log('\n[' + (i + 1) + '/' + pendentes.length + '] ' + m.nome + ' · +' + m.telefone + '\n' + m.mensagem.split('\n').map((l) => '    ' + l).join('\n'));
  });
  console.log('\nSimulação: nada foi enviado.');
  process.exit(0);
}

function salvarFila() {
  try { fs.writeFileSync(filaPath, JSON.stringify(fila, null, 2)); } catch (e) { log('Não consegui gravar o progresso: ' + e.message); }
}

async function main() {
  const baileys = require('@whiskeysockets/baileys');
  const makeWASocket = baileys.default || baileys.makeWASocket;
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
  const pino = require('pino');
  const qrcode = require('qrcode-terminal');

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Amigo X SEMAM', 'Chrome', '2.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true
  });
  sock.ev.on('creds.update', saveCreds);

  let enviando = false;
  sock.ev.on('connection.update', async (u) => {
    if (u.qr) {
      console.log('\nAbra o WhatsApp no celular > Dispositivos conectados > Conectar dispositivo, e leia o QR abaixo:\n');
      qrcode.generate(u.qr, { small: true });
    }
    if (u.connection === 'close') {
      const code = u.lastDisconnect && u.lastDisconnect.error && u.lastDisconnect.error.output && u.lastDisconnect.error.output.statusCode;
      if (code === DisconnectReason.loggedOut) {
        log('Sessão encerrada pelo WhatsApp. Rode "node enviar.js --sair" e conecte de novo.');
        process.exit(1);
      }
      if (!enviando) {
        tentativas++;
        if (tentativas > MAX_TENTATIVAS) { log('Não consegui conectar ao WhatsApp (' + code + ') depois de ' + MAX_TENTATIVAS + ' tentativas. Verifique a internet/firewall e tente de novo.'); process.exit(1); }
        log('Conexão caiu (' + code + '). Tentando de novo (' + tentativas + '/' + MAX_TENTATIVAS + ')…');
        setTimeout(main, 3000);
      } else { log('Conexão caiu no meio do envio (' + code + '). Rode de novo: continua de onde parou.'); process.exit(1); }
    }
    if (u.connection === 'open' && !enviando) {
      enviando = true;
      log('Conectado. Começando os envios (pausa de ' + PAUSA_MIN / 1000 + ' a ' + PAUSA_MAX / 1000 + ' s entre mensagens).');
      let ok = 0, falhas = 0;
      for (let i = 0; i < pendentes.length; i++) {
        const m = pendentes[i];
        const tel = normalizar(m.telefone);
        const rotulo = '[' + (i + 1) + '/' + pendentes.length + '] ' + m.nome + ' (+' + tel + ')';
        try {
          const [info] = await sock.onWhatsApp(tel);
          if (!info || !info.exists) {
            m.status = 'sem-whatsapp'; m.erro = 'número não está no WhatsApp'; falhas++;
            log(rotulo + ' · sem WhatsApp. Pulando.');
          } else {
            await sock.sendMessage(info.jid, { text: m.mensagem });
            m.status = 'enviada'; m.enviadaEm = new Date().toISOString(); delete m.erro; ok++;
            log(rotulo + ' · enviada.');
          }
        } catch (e) {
          m.status = 'erro'; m.erro = String(e && e.message || e); falhas++;
          log(rotulo + ' · ERRO: ' + m.erro);
        }
        if (TESTE === null) salvarFila();
        if (i < pendentes.length - 1) await sleep(pausa());
      }
      log('Fim: ' + ok + ' enviada(s), ' + falhas + ' com problema. ' + (falhas ? 'Veja o campo "erro" no JSON e rode de novo para tentar as pendentes.' : ''));
      if (TESTE === null) log('No sorteador, as linhas enviadas por aqui continuam como "Pendente"; use a fila JSON como registro do envio.');
      await sleep(1500);
      process.exit(0);
    }
  });
}

main().catch((e) => { console.error('Erro inesperado: ' + (e && e.stack || e)); process.exit(1); });
