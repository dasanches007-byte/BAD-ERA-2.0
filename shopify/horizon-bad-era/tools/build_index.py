import os
import json, re, copy, pathlib
ROOT = pathlib.Path(os.environ.get("HORIZON", "/home/user/shopify/horizon"))
HEADER = pathlib.Path("config/settings_data.json").read_text().split("*/", 1)[0] + "*/\n"
d = json.loads(re.sub(r"^/\*.*?\*/", "", (ROOT / "templates/index.json").read_text(), flags=re.S))

def text(html, preset, **kw):
    s = {"text": html, "width": "100%", "max_width": "none", "alignment": "center", "type_preset": preset,
         "font": "var(--font-heading--family)", "font_size": "1rem", "line_height": "tight", "letter_spacing": "normal",
         "case": "uppercase", "wrap": "balance", "background": False, "background_color": "#00000026", "corner_radius": 0,
         "padding-block-start": 0, "padding-block-end": 0, "padding-inline-start": 0, "padding-inline-end": 0}
    s.update(kw)
    return {"type": "text", "name": "t:names.heading", "settings": s, "blocks": {}}

def button(label, link, style, **kw):
    s = {"label": label, "link": link, "open_in_new_tab": False, "style_class": style,
         "custom_button_background": "rgba(0,0,0,0)", "custom_button_text": "#121211", "custom_button_border": "#121211",
         "width": "fit-content", "custom_width": 100, "width_mobile": "fit-content", "custom_width_mobile": 100}
    s.update(kw)
    return {"type": "button", "name": "t:names.button", "settings": s, "blocks": {}}

hero = {
 "type": "hero", "name": "t:names.hero",
 "blocks": {
  "image_lockup": {"type": "image", "name": "t:names.image", "settings": {
     "image": "shopify://shop_images/bad-era-primary-white.png", "link": "", "image_ratio": "adapt",
     "width": "custom", "custom_width": 62, "width_mobile": "custom", "custom_width_mobile": 86, "height": "fit",
     "border": "none", "border_width": 1, "border_opacity": 100, "border_radius": 0,
     "padding-block-start": 0, "padding-block-end": 0, "padding-inline-start": 0, "padding-inline-end": 0}, "blocks": {}},
  "button_shop": button("Shop now", "shopify://collections/shop-all", "button"),
 },
 "block_order": ["image_lockup", "button_shop"],
 "settings": {
  "media_type_1": "image", "image_1": "shopify://shop_images/bad-era-cement-wide.webp",
  "media_type_2": "image", "stack_media_on_mobile": False, "custom_mobile_media": True,
  "media_type_1_mobile": "image", "image_1_mobile": "shopify://shop_images/bad-era-cement.webp",
  "media_type_2_mobile": "image", "link": "", "open_in_new_tab": False,
  "content_direction": "column", "vertical_on_mobile": True, "horizontal_alignment": "center",
  "vertical_alignment": "center", "align_baseline": False,
  "horizontal_alignment_flex_direction_column": "center", "vertical_alignment_flex_direction_column": "center",
  "gap": 36, "section_width": "full-width", "section_height": "full-screen", "section_height_custom": 100,
  "toggle_overlay": True, "overlay_color": "#00000059", "overlay_style": "gradient", "gradient_direction": "to top",
  "blurred_reflection": False, "reflection_opacity": 75, "padding-block-start": 40, "padding-block-end": 40}}

statement = {
 "type": "section", "name": "t:names.section",
 "blocks": {
  # The owner's words (13 Nov 2026), bone on the cement.
  "text_statement": text("<h2>Step in your era.</h2>", "h1", text_color="#f4f1ea"),
  "button_collection": button("Shop the collection", "shopify://collections/shop-all", "button-custom",
                              custom_button_text="#f4f1ea", custom_button_border="#f4f1ea"),
 },
 "block_order": ["text_statement", "button_collection"],
 "settings": {
  "content_direction": "column", "vertical_on_mobile": True, "horizontal_alignment": "center",
  "vertical_alignment": "center", "align_baseline": False,
  "horizontal_alignment_flex_direction_column": "center", "vertical_alignment_flex_direction_column": "center",
  "gap": 32, "section_width": "full-width", "section_height": "large", "section_height_custom": 60,
  # The owner's cement (owner's request, 13 Nov 2026), shade gathering at the bottom.
  "background_media": "image", "background_color": "#2d2d2d",
  "background_image": "shopify://shop_images/bad-era-cement-wide.webp", "background_image_position": "cover",
  "toggle_overlay": True, "overlay_color": "#0000004d", "overlay_style": "gradient", "gradient_direction": "to top",
  "border": "none", "border_width": 1, "border_opacity": 100, "border_radius": 0,
  "padding-block-start": 96, "padding-block-end": 96}}

pl = copy.deepcopy(d["sections"]["product_list_fa6P9H"])
hdr = pl["blocks"]["static-header"]["blocks"]
for k, b in hdr.items():
    if b["type"] == "_product-list-text":
        b["settings"].update({"text": "<h2>Featured drops</h2>", "type_preset": "h3", "font": "var(--font-heading--family)", "case": "uppercase"})
    if b["type"] == "_product-list-button":
        b["settings"].update({"label": "View all", "style_class": "button-secondary"})
        if "link" in b["settings"]: b["settings"]["link"] = "shopify://collections/shop-all"
pl["settings"].update({"collection": "shop-all", "columns": 3, "mobile_columns": "1", "max_products": 6,
                        "columns_gap": 16, "rows_gap": 40, "section_width": "page-width",
                        "padding-block-start": 72, "padding-block-end": 80})

index = {"sections": {"hero_bad_era": hero, "statement_bad_era": statement, "product_list_fa6P9H": pl},
         "order": ["hero_bad_era", "statement_bad_era", "product_list_fa6P9H"]}
pathlib.Path("templates/index.json").write_text(HEADER + json.dumps(index, indent=2) + "\n")
print(json.dumps({k: v["settings"] for k, v in hdr.items()}, indent=1)[:900])
