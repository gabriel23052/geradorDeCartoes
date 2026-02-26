import { debounce, DebounceCancelledError } from "./utils/debounce";

import getDomElement from "./utils/getDomElement";

type TVisibleSection = "noArt" | "loading" | "art";

/**
 * Classe principal responsável por gerenciar a criação da arte,
 * interagindo com o DOM, processando as entradas do usuário e
 * gerando a imagem final com base nos padrões selecionados.
 */
export default class ArtCreator {
  /** Nome do destinatário da arte */
  private name: string = "";

  /** Índice do padrão selecionado no formulário */
  private patternIndex: number = 0;

  /** Lista de padrões disponíveis para criação da arte */
  private patterns: TPattern[];

  /** Seção visível no momento: sem imagem, carregando
   * ou arte pronta */
  private visibleSection: TVisibleSection = "noArt";

  /** URL do blob da arte gerada ou null */
  private imageURL: string | null = null;

  /** Input de texto onde o usuário digita  o nome
   * do destinatário da arte */
  private nameInputElement: HTMLInputElement =
    getDomElement<HTMLInputElement>("nameInput");

  /** Link para download da arte gerada */
  private downloadLink: HTMLAnchorElement =
    getDomElement<HTMLAnchorElement>("downloadLink");

  /** Seletor dropdown dos padrões disponíveis */
  private selectElement: HTMLSelectElement =
    getDomElement<HTMLSelectElement>("select");

  /** Texto exibido quando não há arte gerada */
  private noImageTextElement: HTMLDivElement =
    getDomElement<HTMLParagraphElement>("noImageText");

  /** Indicador de carregamento da arte */
  private loadingElement: HTMLImageElement =
    getDomElement<HTMLImageElement>("loading");

  /** Preview da arte gerada na interface */
  private previewElement: HTMLImageElement =
    getDomElement<HTMLImageElement>("preview");

  /**
   * Inicializa a classe ArtCreator com os padrões
   * disponíveis e configura os event listeners.
   *
   * @param patterns - Array de padrões para geração
   * de imagens
   */
  constructor(patterns: TPattern[]) {
    this.patterns = patterns;
    this.nameInputElement.addEventListener(
      "input",
      this.handleNameInputChange.bind(this),
    );
    this.selectElement.addEventListener(
      "change",
      this.handlePatternIndexChange.bind(this),
    );
    this.patterns.forEach((pattern, index) => {
      const option = document.createElement("option");
      option.value = index.toString();
      option.innerText = pattern.name;
      this.selectElement.appendChild(option);
    });
  }

  /**
   * Manipula mudanças no input de nome do usuário.
   * Atualiza a propriedade name e dispara a
   * regeneração da arte.
   *
   * @param currentTarget - Evento que contém o
   * elemento input
   */
  private handleNameInputChange({ currentTarget }: Event) {
    if (!currentTarget || !(currentTarget instanceof HTMLInputElement)) return;
    this.name = currentTarget.value.trim();
    this.update();
  }

  /**
   * Manipula mudanças no seletor de padrões.
   * Atualiza o patternIndex e regenera a imagem
   * com o novo padrão.
   *
   * @param currentTarget - Evento que contém o
   * elemento select
   */
  private handlePatternIndexChange({ currentTarget }: Event) {
    if (!currentTarget || !(currentTarget instanceof HTMLSelectElement)) return;
    this.patternIndex = Number(currentTarget.value);
    this.update();
  }

  /**
   * Coordena a atualização da imagem. Limpa a
   * imagem anterior, valida o nome, mostra
   * loading e chama createArt para gerar a nova
   * imagem.
   */
  private async update() {
    this.makeImageUnavailable();
    if (this.name.length === 0) {
      this.updateVisibility("noArt");
      return;
    }
    this.updateVisibility("loading");
    try {
      await this.createArt();
    } catch (err) {
      if (err instanceof DebounceCancelledError) return;
      console.error(err);
    }
    if (this.name.length === 0 || this.imageURL === null) return;
    this.makeImageAvailable();
    this.updateVisibility("art");
  }

  /**
   * Controla qual seção (sem arte, carregando
   * ou arte pronta) fica visível na interface usando
   * data attributes.
   *
   * @param newVisibleSection - Nome da seção a
   * ser exibida
   */
  private updateVisibility(newVisibleSection: TVisibleSection) {
    this.visibleSection = newVisibleSection;
    this.noImageTextElement.dataset.show = (
      this.visibleSection === "noArt"
    ).toString();
    this.loadingElement.dataset.show = (
      this.visibleSection === "loading"
    ).toString();
    this.previewElement.dataset.show = (
      this.visibleSection === "art"
    ).toString();
  }

  /**
   * Mostra a arte gerada na interface e atualiza o link
   * de download com a URL do blob e nome do arquivo,
   */
  private makeImageAvailable() {
    if (!this.imageURL) return;
    this.previewElement.src = this.imageURL;
    const filenameName = this.name.replaceAll(" ", "_").toLowerCase();
    const filenamePattern = this.patterns[this.patternIndex].name
      .replaceAll(" ", "_")
      .toLowerCase();
    this.downloadLink.href = this.imageURL;
    this.downloadLink.download = `${filenameName}-${filenamePattern}.jpg`;
    this.downloadLink.dataset.available = "true";
  }

  /**
   * Remove a arte da interface, limpa URLs e
   * desabilita o link de download.
   */
  private makeImageUnavailable() {
    this.downloadLink.dataset.available = "false";
    this.previewElement.src = "";
    this.downloadLink.removeAttribute("href");
    this.downloadLink.removeAttribute("download");
  }

  /**
   * Cria um canvas com a arte do padrão e
   * desenha o nome do usuário sobre ela com as
   * configurações de fonte e cor do padrão.
   *
   * @returns Canvas com a arte e texto
   * renderizado
   */
  private async createCanvas() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível obter o contexto do canvas");
    const pattern = this.patterns[this.patternIndex!];
    canvas.width = pattern.width;
    canvas.height = pattern.height;
    const image = new Image(pattern.width, pattern.height);
    image.src = pattern.imgFile;
    await image.decode();
    ctx.drawImage(image, 0, 0, pattern.width, pattern.height);
    ctx.fillStyle = pattern.color;
    ctx.font = pattern.font;
    ctx.textAlign = "center";
    ctx.fillText(this.name, pattern.x, pattern.y);
    return canvas;
  }

  /**
   * Gera a arte final a partir do canvas,
   * convertendo para blob JPEG e criando uma URL
   * de objeto. Debounced para evitar múltiplas
   * gerações rápidas.
   */
  private createArt = debounce(async () => {
    URL.revokeObjectURL(this.imageURL!);
    const canvas = await this.createCanvas();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        "image/jpeg",
        this.patterns[this.patternIndex!].quality,
      );
    });
    if (!blob) throw new Error("Não foi possível criar o blob da imagem");
    this.imageURL = URL.createObjectURL(blob);
  }, 1000);
}
