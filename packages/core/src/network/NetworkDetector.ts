/**
 * @type Listener
 * Define a assinatura da função de callback que será notificada sobre mudanças no estado da rede.
 */
type Listener = (isOnline: boolean) => void;

/**
 * @interface NetworkDetectorConfig
 * Configuração opcional para o NetworkDetector.
 */
export interface NetworkDetectorConfig {
  /**
   * URL para fazer uma verificação ativa de conectividade (heartbeat).
   * Deve ser um endpoint leve que retorne uma resposta 2xx.
   * Padrão: 'https://httpbin.org/get' (um endpoint público de teste ).
   */
  heartbeatUrl?: string;
  /**
   * Intervalo em milissegundos para a verificação ativa (heartbeat).
   * Padrão: 30000 (30 segundos).
   */
  heartbeatInterval?: number;
}

/**
 * @class NetworkDetector
 * Monitora o estado da conexão de rede e notifica os listeners sobre as mudanças.
 * Combina os eventos 'online'/'offline' do navegador com uma verificação ativa (heartbeat).
 */
export class NetworkDetector {
  private isOnline: boolean;
  private listeners: Set<Listener> = new Set();
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private config: Required<NetworkDetectorConfig>;

  constructor(config: NetworkDetectorConfig = {}) {
    // Define valores padrão para a configuração.
    this.config = {
      heartbeatUrl: config.heartbeatUrl || 'https://httpbin.org/get',
      heartbeatInterval: config.heartbeatInterval || 30000,
    };

    // O estado inicial é baseado na propriedade do navegador.
    this.isOnline = navigator.onLine;

    // Vincula os métodos ao 'this' da instância para garantir o contexto correto nos event listeners.
    this.handleOnline = this.handleOnline.bind(this );
    this.handleOffline = this.handleOffline.bind(this);
    this.runHeartbeat = this.runHeartbeat.bind(this);

    this.attachEventListeners();
    this.startHeartbeat();
  }

  /**
   * Anexa os listeners de eventos 'online' e 'offline' à janela do navegador.
   * @private
   */
  private attachEventListeners(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  /**
   * Remove os listeners de eventos da janela.
   * @private
   */
  private detachEventListeners(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  /**
   * Inicia o processo de verificação ativa (heartbeat) em intervalos regulares.
   * @private
   */
  private startHeartbeat(): void {
    // Limpa qualquer intervalo anterior para evitar múltiplos heartbeats.
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
    }
    // Executa a primeira verificação imediatamente.
    this.runHeartbeat();
    // Agenda as verificações subsequentes.
    this.heartbeatIntervalId = setInterval(this.runHeartbeat, this.config.heartbeatInterval);
  }

  /**
   * Para o processo de heartbeat.
   * @private
   */
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  /**
   * Executa uma única verificação de heartbeat para confirmar a conectividade com a internet.
   * @private
   */
  private async runHeartbeat(): Promise<void> {
    try {
      // O 'fetch' por padrão não envia cookies nem credenciais.
      // O 'cache: "no-store"' garante que estamos fazendo uma requisição de rede real.
      // O 'AbortController' garante que a requisição não demore para sempre.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 segundos

      const response = await fetch(this.config.heartbeatUrl, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Se a requisição for bem-sucedida (status 2xx), estamos online.
      if (response.ok) {
        this.updateStatus(true);
      } else {
        // Se recebermos uma resposta, mas não for 'ok', ainda pode indicar um portal cativo.
        this.updateStatus(false);
      }
    } catch (error) {
      // Qualquer erro de rede (ex: DNS, TCP) significa que estamos offline.
      this.updateStatus(false);
    }
  }

  /**
   * Manipulador para o evento 'online' do navegador.
   * @private
   */
  private handleOnline(): void {
    // O navegador acha que estamos online, mas vamos confirmar com um heartbeat.
    this.runHeartbeat();
  }

  /**
   * Manipulador para o evento 'offline' do navegador.
   * @private
   */
  private handleOffline(): void {
    // Se o navegador diz que estamos offline, podemos confiar nisso.
    this.updateStatus(false);
  }

  /**
   * Atualiza o estado de 'isOnline' e notifica todos os listeners se houver uma mudança.
   * @param {boolean} newStatus - O novo estado da rede.
   * @private
   */
  private updateStatus(newStatus: boolean): void {
    if (this.isOnline !== newStatus) {
      this.isOnline = newStatus;
      console.log(`Network status changed to: ${this.isOnline ? 'Online' : 'Offline'}`);
      // Notifica todos os listeners sobre a mudança.
      this.listeners.forEach(listener => listener(this.isOnline));
    }
  }

  /**
   * Retorna o estado de conexão atual.
   * @returns {boolean} `true` se estiver online, `false` caso contrário.
   */
  public isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Registra uma função de callback para ser notificada sobre mudanças no estado da rede.
   * @param {Listener} listener - A função a ser chamada.
   * @returns {() => void} Uma função para cancelar a inscrição (unsubscribe).
   */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Chama o listener imediatamente com o estado atual.
    listener(this.isOnline);

    // Retorna uma função para remover o listener.
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Limpa todos os listeners e para o heartbeat.
   * Deve ser chamado quando o cliente for destruído para evitar vazamentos de memória.
   */
  public destroy(): void {
    this.detachEventListeners();
    this.stopHeartbeat();
    this.listeners.clear();
    console.log('NetworkDetector destruído.');
  }
}
