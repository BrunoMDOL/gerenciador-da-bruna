import { forwardRef, memo } from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Ban, Bot, FileArchive, FileSpreadsheet, FileText, FileType, Image as ImageIcon,
  Lock, MapPin, MessageSquareOff, Mic, Paperclip, Presentation, UserRound, Video,
} from "lucide-react";
import type { Mensagem, NaoSuportadoTipo } from "@/types/database";
import { motivoCurto, type ResultadoEnvio } from "@/services/statusEnvio";

interface MessageBubbleProps {
  message: Mensagem;
  // O veredito de entrega deste envio, já julgado por `statusEnvio`. Ausente em
  // mensagem de entrada, em tudo anterior ao webhook de status e nos primeiros
  // segundos após o envio.
  veredito?: ResultadoEnvio;
  // Nome de quem do time enviou (usuarios_nome, por `enviado_por`). Sem ele a
  // bolha diz "Atendente": é o caso de tudo antes de 14/05/2026, quando o
  // autor ainda não era registrado.
  nomeRemetente?: string;
}

// Corrige URLs de mídia que foram salvas sem extensão pelo n8n
function fixMediaUrl(url: string | null, messageType: string | null): string | null {
  if (!url) return null;
  if (url.endsWith(".")) {
    if (messageType === "image") return url + "jpg";
    if (messageType === "audio" || messageType === "ptt") return url + "ogg";
    if (messageType === "video") return url + "mp4";
    if (messageType === "document") return url + "pdf";
  }
  return url;
}

function getFileNameFromUrl(url: string): string {
  const parts = url.split("/");
  const fileName = parts[parts.length - 1];
  return fileName.split("?")[0] || "documento";
}

function getDocumentIcon(url: string) {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith(".pdf")) return FileText;
  if (lowerUrl.endsWith(".doc") || lowerUrl.endsWith(".docx")) return FileType;
  if (lowerUrl.endsWith(".xls") || lowerUrl.endsWith(".xlsx")) return FileSpreadsheet;
  if (lowerUrl.endsWith(".ppt") || lowerUrl.endsWith(".pptx")) return Presentation;
  if (lowerUrl.endsWith(".txt")) return FileText;
  if (lowerUrl.endsWith(".zip") || lowerUrl.endsWith(".rar")) return FileArchive;
  return Paperclip;
}

function getAudioMimeType(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith(".ogg") || lowerUrl.endsWith(".opus")) return "audio/ogg";
  if (lowerUrl.endsWith(".mp3")) return "audio/mpeg";
  if (lowerUrl.endsWith(".m4a") || lowerUrl.endsWith(".mp4")) return "audio/mp4";
  if (lowerUrl.endsWith(".aac")) return "audio/aac";
  if (lowerUrl.endsWith(".webm")) return "audio/webm";
  return "audio/ogg";
}

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  if (url.includes("drive.google.com")) {
    return url.replace("/view", "/preview").split("?")[0];
  }
  return url;
}

function formatMessageTime(timestamp: string): string {
  const utcTimestamp = timestamp.endsWith("Z") ? timestamp : timestamp + "Z";
  const date = new Date(utcTimestamp);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const spFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  const msgDateStr = spFormatter.format(date);
  const nowDateStr = spFormatter.format(new Date());
  if (msgDateStr === nowDateStr) return time;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = spFormatter.format(yesterday);
  if (msgDateStr === yesterdayStr) return `Ontem ${time}`;
  const msgYear = date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric" });
  const nowYear = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric" });
  if (msgYear === nowYear) {
    return `${msgDateStr.slice(0, 5)} ${time}`;
  }
  return `${msgDateStr} ${time}`;
}

/**
 * A bolha do que o WhatsApp não entregou.
 *
 * Antes daqui ela vinha vazia: o banco grava content '[MÍDIA]', o balão suprime
 * exatamente esse texto e não havia ramo nenhum para 'nao_suportado' — sobrava o
 * horário sozinho, e quem lia a conversa não tinha como saber que algo tinha
 * acontecido ali.
 *
 * São casos diferentes com a mesma marca, por isso o texto muda: 'revoke' é o
 * cliente apagando a mensagem; 'unknown' é enquete, "ver uma vez", resposta de
 * status ou o eco de um álbum, que a Meta nomeia como tal. Chamar tudo de
 * "apagada" erraria na maioria — das 15 primeiras, 13 eram eco de álbum.
 *
 * Nulo é o que foi gravado antes de 14/09/2026, quando o PARSE ainda descartava
 * essa palavra: aí não se sabe qual dos dois foi, e o texto não finge saber.
 */
function avisoNaoSuportado(tipo: NaoSuportadoTipo | null | undefined) {
  if (tipo === "revoke") {
    return {
      Icone: Ban,
      texto: "Mensagem apagada pelo contato",
      titulo: "O contato apagou esta mensagem no WhatsApp (\"apagar para todos\"). A Meta avisa que ela existiu, mas não envia o conteúdo — não há o que recuperar.",
    };
  }
  return {
    Icone: MessageSquareOff,
    texto: "Mensagem não entregue pelo WhatsApp",
    titulo: tipo === "unknown"
      ? "O WhatsApp não repassa este tipo de mensagem: enquete, \"ver uma vez\", resposta de status ou o eco de um álbum. O conteúdo nunca chega aqui."
      : "O WhatsApp avisou que o contato mandou algo que a API não entrega, sem dizer o quê. Mensagens anteriores a 14/09/2026 não guardavam esse detalhe.",
  };
}

function Check({ duplo, className, titulo }: { duplo: boolean; className?: string; titulo?: string }) {
  const traco = { stroke: "currentColor", strokeWidth: 1.5, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

  // O tique simples usa viewBox próprio: reaproveitar o de dois tiques deixaria
  // um vão à direita, e a marca sairia desalinhada do horário ao lado.
  if (!duplo) {
    return (
      <svg width="10" height="9" viewBox="0 0 12 11" className={cn("inline-block ml-1", className)} role="img" aria-label={titulo}>
        {titulo && <title>{titulo}</title>}
        <path d="M1 5.5L4.5 9L11 2" {...traco} />
      </svg>
    );
  }

  return (
    <svg width="14" height="9" viewBox="0 0 16 11" className={cn("inline-block ml-1", className)} role="img" aria-label={titulo}>
      {titulo && <title>{titulo}</title>}
      <path d="M1 5.5L4.5 9L11 2" {...traco} />
      <path d="M5 5.5L8.5 9L15 2" {...traco} />
    </svg>
  );
}

/**
 * Antes daqui toda mensagem de saída exibia o mesmo tique azul, fixo, sem
 * relação com a realidade — inclusive as que a Meta aceitou e descartou. Agora
 * cada estado tem sua marca, e o descarte aparece por escrito: cor sozinha não
 * conta a alguém que não distingue vermelho.
 */
function StatusEntregaIcone({ veredito }: { veredito?: ResultadoEnvio }) {
  if (!veredito || veredito.status === "sem_retorno") {
    return (
      <Check duplo={false} className="text-muted-foreground/50" titulo="Aceita pela Meta — sem confirmação de envio" />
    );
  }

  if (veredito.status === "falhou") {
    const motivo = motivoCurto({ codigo: veredito.erroCodigo, titulo: veredito.erroDetalhe || veredito.erroTitulo });
    const codigo = veredito.erroCodigo ? ` ${veredito.erroCodigo}` : "";
    return (
      <span
        className="ml-1.5 inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-2xs font-medium text-destructive align-middle"
        title={`A Meta aceitou e não entregou. Erro${codigo}: ${motivo}`}
      >
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
        não entregue{codigo}
      </span>
    );
  }

  if (veredito.status === "lido") {
    return <Check duplo className="text-primary" titulo="Lida" />;
  }
  if (veredito.status === "entregue") {
    return <Check duplo className="text-muted-foreground" titulo="Entregue no aparelho" />;
  }
  // saiu: aceita e enviada, sem confirmação de entrega ainda
  return <Check duplo={false} className="text-muted-foreground" titulo="Enviada pela Meta — ainda sem confirmação de entrega" />;
}

const MessageBubbleImpl = forwardRef<HTMLDivElement, MessageBubbleProps>(function MessageBubble({ message, veredito, nomeRemetente }, ref) {
  const isCustomer = message.sender_type === "customer" || message.direction === "inbound";

  const isNotaInterna = message.message_type === "nota_interna";

  if (isNotaInterna) {
    return (
      <div ref={ref} className="flex justify-center my-2">
        <div className="max-w-[85%] rounded-xl border border-warning/40 bg-warning/10 px-4 py-2.5">
          <p className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-warning">
            <Lock className="h-3 w-3 shrink-0" aria-hidden />
            Nota interna — não enviada ao cliente
          </p>
          <p className="whitespace-pre-wrap break-words text-sm text-foreground">
            {message.content}
          </p>
          <p className="mt-1 text-right text-2xs text-muted-foreground">
            {formatMessageTime(message.created_at)}
          </p>
        </div>
      </div>
    );
  }

  const isAgent = message.sender_type === "agent";
  const isHuman = message.sender_type === "human";
  const isOutbound = !isCustomer;

  const isAudio = message.message_type === "audio" || message.message_type === "ptt";
  const isImage = message.message_type === "image";
  const isVideo = message.message_type === "video";
  const isDocument = message.message_type === "document";
  const isLocation = message.message_type === "location";
  const isNaoSuportado = message.message_type === "nao_suportado";

  const mediaUrl = fixMediaUrl(message.media_url, message.message_type);
  const hasValidUrl = mediaUrl?.startsWith("http");

  // A Bruna Pós-venda e a Bruna Reconquista gravam sender_name próprio
  // (enviar-pos-venda). Ganham rótulo e cor próprios para a equipe saber na
  // hora qual Bruna está falando (pedido do dono em 29/10/2026).
  const brunaEspecial = isAgent && (message.sender_name === "Bruna Pós-venda" || message.sender_name === "Bruna Reconquista");
  const senderLabel = isAgent ? (brunaEspecial ? message.sender_name! : "Bruna IA") : isHuman ? (nomeRemetente || "Atendente") : null;

  return (
    <div ref={ref} className={cn("flex items-end gap-2", isCustomer ? "justify-start" : "justify-end")}>
      {/* Message content */}
      <div
        className={cn(
          "max-w-[75%] px-4 py-2.5 border text-sm leading-relaxed text-foreground shadow-sm rounded-2xl",
          isCustomer && "rounded-bl-md bg-bubble-customer border-border",
          // Saída: a Bruna em coral, o atendente em balão invertido. Antes as
          // duas usavam o mesmo fundo e só o rótulo diferenciava — no histórico
          // rolando, ninguém achava onde um humano tinha entrado.
          isOutbound && "rounded-br-md",
          isOutbound && isAgent && !brunaEspecial && "bg-bubble-agent border-primary/30",
          isOutbound && brunaEspecial && "bg-bubble-posvenda border-posvenda/40",
          // O texto de dentro troca de cor pela regra .bg-bubble-human (index.css).
          isOutbound && !isAgent && "bg-bubble-human border-transparent",
        )}
      >
        {/* Sender label for outbound */}
        {isOutbound && senderLabel && (
          <p className={cn(
            "text-2xs font-medium mb-1",
            brunaEspecial ? "text-posvenda" : isAgent ? "text-bot" : "text-human"
          )}>
            {senderLabel}
          </p>
        )}

        {/* Template badge */}
        {message.message_type === "template" && message.template_name && (
          <div className="pb-1.5 mb-1.5 border-b border-border">
            <span className="inline-flex items-center gap-1.5 text-xs text-primary/70"><FileText className="h-3 w-3 shrink-0" aria-hidden />{message.template_name}</span>
          </div>
        )}

        {/* Image */}
        {isImage && (
          <>
            {hasValidUrl ? (
              <img
                src={mediaUrl!}
                alt="Foto do WhatsApp"
                className="max-w-full rounded-xl mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(mediaUrl!, "_blank")}
                loading="lazy"
              />
            ) : (
              <div className="mb-1 flex items-center gap-1.5 text-xs opacity-70"><ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />Foto (mídia não disponível)</div>
            )}
          </>
        )}

        {/* Audio */}
        {isAudio && (
          <>
            {hasValidUrl ? (
              <audio controls className="max-w-[250px] h-10 mb-2" preload="metadata">
                <source src={mediaUrl!} type={getAudioMimeType(mediaUrl!)} />
                Seu navegador não suporta áudio.
              </audio>
            ) : (
              <div className="mb-1 flex items-center gap-1.5 text-xs opacity-70"><Mic className="h-3.5 w-3.5 shrink-0" aria-hidden />Áudio (mídia não disponível)</div>
            )}
          </>
        )}

        {/* Video */}
        {isVideo && (
          <>
            {hasValidUrl ? (
              mediaUrl?.includes("drive.google.com") ? (
                <iframe
                  src={getVideoEmbedUrl(mediaUrl)!}
                  width="100%"
                  height="300"
                  className="rounded-xl mb-2"
                  allow="autoplay"
                  allowFullScreen
                />
              ) : (
                <video controls className="max-w-full rounded-xl mb-2" preload="metadata">
                  <source src={mediaUrl!} />
                  Seu navegador não suporta vídeo.
                </video>
              )
            ) : (
              <div className="mb-1 flex items-center gap-1.5 text-xs opacity-70"><Video className="h-3.5 w-3.5 shrink-0" aria-hidden />Vídeo (mídia não disponível)</div>
            )}
          </>
        )}

        {/* Document */}
        {isDocument && (
          <>
            {hasValidUrl ? (
              <div className="mb-2">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-xl mb-2">
                  {(() => { const Icone = getDocumentIcon(mediaUrl!); return <Icone className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />; })()}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium truncate max-w-[200px]">{getFileNameFromUrl(mediaUrl!)}</span>
                    <div className="flex gap-2 mt-1">
                      <a
                        href={`https://docs.google.com/viewer?url=${encodeURIComponent(mediaUrl!)}&embedded=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline text-muted-foreground hover:text-foreground"
                      >
                        Visualizar
                      </a>
                      <a
                        href={mediaUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline text-muted-foreground hover:text-foreground"
                      >
                        Baixar
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-1 flex items-center gap-1.5 text-xs opacity-70"><FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />Documento (mídia não disponível)</div>
            )}
          </>
        )}

        {/* Location */}
        {isLocation &&
          (() => {
            let lat: number, lng: number;
            try {
              if (message.content.includes("{")) {
                const parsed = JSON.parse(message.content);
                lat = parsed.latitude;
                lng = parsed.longitude;
              } else {
                [lat, lng] = message.content.split(",").map(Number);
              }
              if (isNaN(lat) || isNaN(lng)) throw new Error("Invalid coords");
            } catch {
              return <p className="text-sm mb-2">Localização (formato inválido)</p>;
            }
            const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
            return (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-2"
              >
                <div className="flex items-center gap-2 p-3 bg-muted rounded-xl hover:bg-accent transition-colors">
                  <MapPin className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
                  <div>
                    <span className="text-sm font-medium">Localização</span>
                    <span className="text-xs block text-muted-foreground">
                      {lat.toFixed(6)}, {lng.toFixed(6)}
                    </span>
                    <span className="text-xs block text-muted-foreground/60">Clique para abrir no Maps</span>
                  </div>
                </div>
              </a>
            );
          })()}

        {/* O que o WhatsApp não entregou */}
        {isNaoSuportado &&
          (() => {
            const { Icone, texto, titulo } = avisoNaoSuportado(message.nao_suportado_tipo);
            return (
              <p className="flex items-center gap-1.5 text-sm italic text-muted-foreground" title={titulo}>
                <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {texto}
              </p>
            );
          })()}

        {/* Text content */}
        {message.content && message.content !== "[MÍDIA]" && !isLocation && !isNaoSuportado && (
          <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
        )}

        {/* Timestamp + status de entrega */}
        <p className="mt-1 text-right text-2xs text-muted-foreground">
          {formatMessageTime(message.created_at)}
          {isOutbound && <StatusEntregaIcone veredito={veredito} />}
        </p>
      </div>

      {/* Role icon for outbound messages */}
      {isOutbound && (
        <div className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mb-1",
          isAgent 
            ? "bg-bot/15 border border-bot/30"
            : "bg-human/15 border border-human/30"
        )}>
          {isAgent ? (
            <Bot className="h-3.5 w-3.5 text-bot" aria-label="Bruna" />
          ) : (
            <UserRound className="h-3.5 w-3.5 text-human" aria-label="Atendimento humano" />
          )}
        </div>
      )}
    </div>
  );
});

// Memoizado: numa lista longa, uma mensagem nova (realtime) nao deve
// re-renderizar todas as bolhas anteriores, apenas a que mudou.
export const MessageBubble = memo(MessageBubbleImpl);
