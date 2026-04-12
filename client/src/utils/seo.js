export function setSEO({ title, description, image, url }) {
  if (typeof document === "undefined") return;

  if (title) {
    document.title = title;
  }

  const setMeta = (name, content, attr = "name") => {
    if (!content) return;

    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  if (description) setMeta("description", description);

  if (title) setMeta("og:title", title, "property");
  if (description) setMeta("og:description", description, "property");
  if (image) setMeta("og:image", image, "property");
  if (url) setMeta("og:url", url, "property");
  setMeta("og:type", "website", "property");

  if (title) setMeta("twitter:title", title);
  if (description) setMeta("twitter:description", description);
  if (image) setMeta("twitter:image", image);
  setMeta("twitter:card", "summary_large_image");

  if (url) {
    let link = document.querySelector("link[rel='canonical']");
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);
  }
}