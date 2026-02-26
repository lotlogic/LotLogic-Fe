/* LotLogic embed loader
 *
 * Example:
 * <script
 *   src="https://your-host/lotlogic-embed.js"
 *   data-estate-id="estate-123"
 *   data-brand="brand-guid"
 *   data-target="#lotlogic-root"
 *   data-height="760"
 * ></script>
 */
(function () {
  var script = document.currentScript;

  if (!script) {
    console.error("[LotLogic] Unable to resolve current script element.");
    return;
  }

  var estateId = (script.getAttribute("data-estate-id") || "").trim();
  if (!estateId) {
    console.error("[LotLogic] Missing required data-estate-id attribute.");
    return;
  }

  var brand = (script.getAttribute("data-brand") || "").trim();
  var targetSelector = (script.getAttribute("data-target") || "").trim();
  var height = (script.getAttribute("data-height") || "760").trim();
  var width = (script.getAttribute("data-width") || "100%").trim();
  var baseUrlOverride = (script.getAttribute("data-base-url") || "").trim();

  var defaultBaseUrl = script.src.replace(/\/lotlogic-embed\.js(?:\?.*)?$/i, "");
  var baseUrl = (baseUrlOverride || defaultBaseUrl).replace(/\/+$/, "");

  var embedUrl = baseUrl + "/embed/" + encodeURIComponent(estateId);
  var params = [];
  params.push("embed=1");
  if (brand) {
    params.push("brand=" + encodeURIComponent(brand));
  }
  if (params.length > 0) {
    embedUrl += "?" + params.join("&");
  }

  var iframe = document.createElement("iframe");
  iframe.src = embedUrl;
  iframe.loading = "lazy";
  iframe.style.width = width;
  iframe.style.height = /[a-z%]+$/i.test(height) ? height : height + "px";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.setAttribute("allowfullscreen", "true");
  iframe.setAttribute("title", "LotLogic Estate Viewer");
  iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

  var host = null;
  if (targetSelector) {
    host = document.querySelector(targetSelector);
  }

  if (!host) {
    host = document.createElement("div");
    script.parentNode.insertBefore(host, script.nextSibling);
  }

  host.appendChild(iframe);
})();
