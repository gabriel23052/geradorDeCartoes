import "./main.css";

import patterns from "./patterns";

const getDomElement = <T extends Element>(selector: string): T => {
  const element = document.querySelector(selector);
  if (!(element instanceof Element)) {
    throw new Error(`O elemento "${selector}" não pode ser localizado no DOM`);
  }
  return element as T;
};

/* -- Objeto com os itens do DOM -- */
const dom = {
  backButton: getDomElement<HTMLButtonElement>(`[data-selector="backBtn"]`),
  downloadButton: getDomElement<HTMLAnchorElement>(`[data-selector="downBtn"]`),
  modal: getDomElement<HTMLDivElement>(`[data-selector="modal"]`),
  image: getDomElement<HTMLImageElement>(`[data-selector="img"]`),
  input: getDomElement<HTMLInputElement>(`[data-selector="nameInput"]`),
  select: getDomElement<HTMLSelectElement>(`[data-selector="select"]`),
  genButton: getDomElement<HTMLButtonElement>(`[data-selector="genBtn"]`),
};

/* -- Objeto que controla o modal -- */
const modal = {
  state: false,
  toggle: function () {
    dom.modal.classList.toggle("active");
    modal.state = !modal.state;
  },
  eventListeners: function () {
    dom.backButton.addEventListener("click", this.toggle);
    document.addEventListener("keydown", (e) => {
      if (modal.state && e.key === "Escape") {
        this.toggle();
      }
    });
  },
};
modal.eventListeners();

/* -- Preenche o seletor com os modelos -- */
patterns.forEach((pattern, index) => {
  const option = document.createElement("option");
  option.value = index.toString();
  option.innerText = pattern.name;
  dom.select.appendChild(option);
});

/* -- Bloqueio e desbloqueio do botão -- */
dom.input.addEventListener("input", (e: Event) => {
  if (!e.currentTarget || !(e.currentTarget instanceof HTMLInputElement))
    return;
  if (e.currentTarget.value === "") {
    dom.genButton.classList.remove("active");
    enableButton = false;
  } else {
    dom.genButton.classList.add("active");
    enableButton = true;
  }
});

/* -- Botão que gera a imagem --*/
let enableButton = false;
dom.genButton.addEventListener("click", (e) => {
  e.preventDefault();
  if (enableButton) {
    genArt(dom.input.value, Number(dom.select.value));
  }
});

/* -- Função que gera a imagem da arte -- */
function genImg(
  name: string,
  pattern: TPattern,
  callback: (imgUrl: string) => void,
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível resgatar o contexto do Canvas");
  }
  const { width, height, x, y, imgFile, font, color, quality } = pattern;
  canvas.width = width;
  canvas.height = height;
  const image = new Image();
  image.src = imgFile;
  image.onload = () => {
    ctx.drawImage(image, 0, 0, width, height);
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.fillText(name, x, y);
    callback(canvas.toDataURL("image/jpeg", quality));
  };
}

/* -- Função que apresenta a arte -- */
function genArt(name: string, patternIndex: number) {
  genImg(name, patterns[patternIndex], (img) => {
    dom.image.src = img;
    modal.toggle();
    dom.downloadButton.href = img.replace("image/jpeg", "image/octet-stream");
    dom.downloadButton.download = "arte.jpeg";
  });
}
