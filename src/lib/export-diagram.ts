const SVG_NS = "http://www.w3.org/2000/svg";

function roundDimension(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

function parseViewBox(viewBox: string | null) {
  if (!viewBox) {
    return null;
  }

  const parts = viewBox
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number.parseFloat(part));

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  return {
    minX: parts[0],
    minY: parts[1],
    width: parts[2],
    height: parts[3],
  };
}

function inlineStylesRecursively(
  sourceNode: Element,
  clonedNode: Element,
  sourceDocument: Document,
) {
  const sourceChildren = Array.from(sourceNode.children);
  const clonedChildren = Array.from(clonedNode.children);
  const sourceWindow = sourceDocument.defaultView;

  if (sourceWindow) {
    const computedStyle = sourceWindow.getComputedStyle(sourceNode);
    const styleText = Array.from(computedStyle)
      .map((property) => `${property}:${computedStyle.getPropertyValue(property)};`)
      .join("");

    if (styleText) {
      clonedNode.setAttribute("style", styleText);
    }
  }

  sourceChildren.forEach((child, index) => {
    const clonedChild = clonedChildren[index];
    if (clonedChild) {
      inlineStylesRecursively(child, clonedChild, sourceDocument);
    }
  });
}

export function normalizeSvgMarkupForExport(svgMarkup: string, fallbackTitle?: string) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svg = parsed.documentElement;

  if (svg.nodeName.toLowerCase() !== "svg") {
    throw new Error("The diagram preview did not produce a valid SVG.");
  }

  const explicitWidth = Number.parseFloat(svg.getAttribute("width") ?? "");
  const explicitHeight = Number.parseFloat(svg.getAttribute("height") ?? "");
  const viewBox = parseViewBox(svg.getAttribute("viewBox"));
  const width = roundDimension(explicitWidth || viewBox?.width || 1600, 1600);
  const height = roundDimension(explicitHeight || viewBox?.height || 1200, 1200);

  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", svg.getAttribute("viewBox") ?? `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  if (fallbackTitle && !svg.querySelector("title")) {
    const title = parsed.createElementNS(SVG_NS, "title");
    title.textContent = fallbackTitle;
    svg.insertBefore(title, svg.firstChild);
  }

  return {
    width,
    height,
    svgMarkup: new XMLSerializer().serializeToString(svg),
  };
}

export function prepareSvgElementForExport(
  svgElement: SVGSVGElement,
  fallbackTitle?: string,
) {
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  inlineStylesRecursively(svgElement, clonedSvg, svgElement.ownerDocument);

  const explicitWidth = Number.parseFloat(clonedSvg.getAttribute("width") ?? "");
  const explicitHeight = Number.parseFloat(clonedSvg.getAttribute("height") ?? "");
  const viewBox = parseViewBox(clonedSvg.getAttribute("viewBox"));
  const width = roundDimension(explicitWidth || viewBox?.width || 1600, 1600);
  const height = roundDimension(explicitHeight || viewBox?.height || 1200, 1200);

  clonedSvg.setAttribute("xmlns", SVG_NS);
  clonedSvg.setAttribute("width", String(width));
  clonedSvg.setAttribute("height", String(height));
  clonedSvg.setAttribute(
    "viewBox",
    clonedSvg.getAttribute("viewBox") ?? `0 0 ${width} ${height}`,
  );
  clonedSvg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  if (fallbackTitle && !clonedSvg.querySelector("title")) {
    const title = svgElement.ownerDocument.createElementNS(SVG_NS, "title");
    title.textContent = fallbackTitle;
    clonedSvg.insertBefore(title, clonedSvg.firstChild);
  }

  return {
    width,
    height,
    svgMarkup: new XMLSerializer().serializeToString(clonedSvg),
  };
}

function triggerBlobDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadSvgMarkup(filename: string, svgMarkup: string) {
  triggerBlobDownload(
    filename,
    new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }),
  );
}

export function downloadTextContent(
  filename: string,
  content: string,
  contentType = "text/plain;charset=utf-8",
) {
  triggerBlobDownload(filename, new Blob([content], { type: contentType }));
}

export function openSvgMarkupInNewTab(svgMarkup: string) {
  const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function downloadSvgElementAsPng(
  filename: string,
  svgMarkup: string,
  width: number,
  height: number,
) {
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.crossOrigin = "anonymous";
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => {
      reject(
        new Error(
          "Could not render SVG as PNG. Try Download SVG or Open SVG in new tab instead.",
        ),
      );
    };
    nextImage.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("PNG export is not available in this browser.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const pngBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });

  if (!pngBlob) {
    throw new Error("Could not convert this diagram into PNG.");
  }

  triggerBlobDownload(filename, pngBlob);
}
