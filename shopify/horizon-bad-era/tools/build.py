import json, copy, re, pathlib

HEADER = """/*
 * ------------------------------------------------------------
 * IMPORTANT: The contents of this file are auto-generated.
 *
 * This file may be updated by the Shopify admin theme editor
 * or related systems. Please exercise caution as any changes
 * made to this file may be overwritten.
 * ------------------------------------------------------------
 */
"""
P = "{{ settings.color_palette.%s }}"

# ---------------------------------------------------------------- settings
original = {
 "logo_height": 36, "logo_height_mobile": 28,
 "page_background_color": P % "background", "page_width": "narrow", "page_text_color": P % "foreground",
 "type_body_font": "inter_n4", "type_subheading_font": "inter_n5", "type_heading_font": "inter_n7", "type_accent_font": "inter_n7",
 "type_size_paragraph": "14", "type_line_height_paragraph": "body-loose",
 "type_font_h1": "heading", "type_size_h1": "56", "type_line_height_h1": "display-tight", "type_letter_spacing_h1": "heading-normal", "type_case_h1": "none",
 "type_font_h2": "heading", "type_size_h2": "48", "type_line_height_h2": "display-tight", "type_letter_spacing_h2": "heading-normal", "type_case_h2": "none",
 "type_font_h3": "heading", "type_size_h3": "32", "type_line_height_h3": "display-normal", "type_letter_spacing_h3": "heading-normal", "type_case_h3": "none",
 "type_font_h4": "heading", "type_size_h4": "24", "type_line_height_h4": "display-tight",
 "type_font_h5": "subheading", "type_size_h5": "14", "type_line_height_h5": "display-loose",
 "type_font_h6": "subheading", "type_size_h6": "12", "type_line_height_h6": "display-loose",
 "page_transition_enabled": False, "transition_to_main_product": False, "card_hover_effect": "none",
 "badge_position": "top-right", "badge_corner_radius": 100,
 "badge_sale_background_color": P % "background", "badge_sale_text_color": P % "foreground",
 "badge_sold_out_background_color": "#eef1ea", "badge_sold_out_text_color": P % "foreground", "badge_text_transform": "none",
 "palette_primary_button_background": P % "foreground", "palette_primary_button_text": P % "background", "palette_primary_button_border": P % "foreground",
 "primary_button_border_width": 0, "button_border_radius_primary": 14,
 "palette_secondary_button_background": "rgba(0,0,0,0)", "palette_secondary_button_text": P % "foreground", "palette_secondary_button_border": P % "foreground",
 "secondary_button_border_width": 1, "button_border_radius_secondary": 14,
 "cart_type": "drawer", "cart_price_font": "subheading", "show_cart_note": False, "show_add_discount_code": True,
 "drawer_background_color": P % "background", "drawer_text_color": P % "foreground", "drawer_border_color": P % "color2",
 "icon_stroke": "default",
 "palette_input_background": P % "background", "palette_input_text": P % "color1", "palette_input_border": P % "color2",
 "input_border_width": 1, "inputs_border_radius": 4,
 "popover_background_color": P % "background", "popover_text_color": P % "foreground", "popover_border_radius": 14,
 "popover_border_color": P % "color2", "popover_border_width": 1,
 "currency_code_enabled_product_pages": False, "currency_code_enabled_product_cards": False, "currency_code_enabled_cart_items": False,
 "quick_add_background": P % "background", "quick_add_text": P % "foreground",
 "product_corner_radius": 0, "card_corner_radius": 4, "show_variant_image": False,
 "variant_swatch_width": 34, "variant_swatch_height": 34, "variant_swatch_radius": 32,
 "palette_variant_background": P % "background", "palette_variant_text": P % "foreground", "palette_variant_border": P % "color2",
 "palette_selected_variant_background": P % "foreground", "palette_selected_variant_text": P % "background", "palette_selected_variant_border": P % "foreground",
 "variant_button_border_width": 1, "variant_button_radius": 14, "variant_button_width": "equal-width-buttons",
 "color_palette": {"background": "#ffffff", "foreground": "#000000", "color1": "#333333", "color2": "#DFDFDF"},
}

current = copy.deepcopy(original)
current.update({
 # The locked artwork: BAD (secondary) in the header, white on the dark
 # theme; the black BAD for any light surface. Never typeset.
 "logo": "shopify://shop_images/bad-secondary-white.png",
 "logo_inverse": "shopify://shop_images/bad-secondary-black.png",
 "favicon": "shopify://shop_images/bad-era-icon.png",
 "logo_height": 34, "logo_height_mobile": 28,
 # No colour: near-black, bone, steel and a hairline.
 "color_palette": {"background": "#0e0e0d", "foreground": "#f4f1ea", "color1": "#9d9a94", "color2": "#2c2b29"},
 "page_width": "wide",
 # Headlines: the poster voice (face set in assets/bad-era.css), capitals.
 "type_size_h1": "88", "type_letter_spacing_h1": "heading-tight", "type_case_h1": "uppercase",
 "type_size_h2": "72", "type_letter_spacing_h2": "heading-tight", "type_case_h2": "uppercase",
 "type_size_h3": "40", "type_letter_spacing_h3": "heading-tight", "type_case_h3": "uppercase", "type_line_height_h3": "display-tight",
 "type_size_h4": "32", "type_case_h4": "uppercase", "type_letter_spacing_h4": "heading-tight",
 "type_case_h5": "uppercase", "type_case_h6": "uppercase",
 # Pills: solid bone, or a bone outline.
 "primary_button_border_width": 0, "button_border_radius_primary": 100, "button_text_case_primary": "uppercase",
 "secondary_button_border_width": 2, "button_border_radius_secondary": 100, "button_text_case_secondary": "uppercase",
 "variant_button_radius": 100, "variant_swatch_radius": 100,
 "badge_corner_radius": 100, "badge_text_transform": "uppercase",
 "badge_sold_out_background_color": P % "color2", "badge_sold_out_text_color": P % "foreground",
 "inputs_border_radius": 0, "popover_border_radius": 0, "card_corner_radius": 0,
 "product_title_case": "uppercase", "card_title_case": "uppercase",
 "cart_price_font": "subheading",
})

settings = {"current": current, "presets": {"Horizon": original}}
pathlib.Path("config/settings_data.json").write_text(HEADER + json.dumps(settings, indent=2) + "\n")

# ---------------------------------------------------------------- header
seam = "content: ''; position: absolute; inset: 14px; border: 1.5px dashed rgb(244 241 234 / 0.5); pointer-events: none;"
header = {
 "type": "header", "name": "t:names.header",
 "sections": {
  "header_announcements_9jGBFp": {
   "type": "header-announcements",
   "blocks": {"announcement_BxgCk9": {"type": "_announcement", "settings": {
     "text": "Limited drops. Quality over quantity.", "font": "var(--font-body--family)",
     "font_size": "0.75rem", "letter_spacing": "loose", "case": "uppercase"}, "blocks": {}}},
   "block_order": ["announcement_BxgCk9"], "name": "t:names.announcement_bar",
   "settings": {"speed": 5, "section_width": "page-width", "background_color": "#000000",
     "divider_width": 0, "divider_color": P % "color2", "padding-block-start": 10, "padding-block-end": 10}},
  "header_section": {
   "type": "header",
   "blocks": {
    "header-logo": {"type": "_header-logo", "static": True, "settings": {"hide_logo_on_home_page": False,
       "padding-block-start": 0, "padding-block-end": 0}, "blocks": {}},
    "header-menu": {"type": "_header-menu", "static": True, "settings": {
       "menu": "main-menu", "type_font_primary_size": "0.75rem", "menu_font_style": "inverse",
       "type_font_primary_link": "body", "type_case_primary_link": "uppercase", "menu_style": "featured_products",
       "featured_products_aspect_ratio": "4 / 5", "featured_collections_aspect_ratio": "16 / 9",
       "image_border_radius": 0, "navigation_bar": False, "drawer_accordion": False,
       "drawer_accordion_expand_first": False, "drawer_dividers": True}, "blocks": {}}},
   "settings": {
    "logo_position": "left", "menu_position": "left", "menu_row": "top", "show_search": True,
    "search_position": "right", "search_row": "top", "show_country": False, "country_selector_style": False,
    "show_language": False, "localization_font": "heading", "localization_font_size": "0.875rem",
    "localization_position": "right", "localization_row": "top", "section_width": "page-width",
    "section_height": "standard", "enable_sticky_header": "always", "divider_width": 0, "divider_size": "page-width",
    "border_width": 0, "background_color_top": P % "background",
    "enable_transparent_header_home": True, "home_inverse_logo": False,
    "enable_transparent_header_product": False, "enable_transparent_header_collection": False}}},
 "order": ["header_announcements_9jGBFp", "header_section"]}
pathlib.Path("sections/header-group.json").write_text(HEADER + json.dumps(header, indent=2) + "\n")

# ---------------------------------------------------------------- footer
def text_block(html, preset, **kw):
    s = {"text": html, "width": "100%", "max_width": "normal", "alignment": kw.get("alignment", "left"),
         "type_preset": preset, "font": "var(--font-body--family)", "font_size": "1rem", "line_height": "normal",
         "letter_spacing": "normal", "case": "none", "wrap": "pretty", "background": False,
         "background_color": "#00000026", "corner_radius": 0, "padding-block-start": 0, "padding-block-end": 0,
         "padding-inline-start": 0, "padding-inline-end": 0}
    s.update({k: v for k, v in kw.items() if k != "alignment"})
    return {"type": "text", "settings": s, "blocks": {}}

footer = {
 "type": "footer", "name": "t:names.footer",
 "sections": {
  "footer_m9NzUG": {
   "type": "footer",
   "blocks": {
    "group_H6VpwJ": {"type": "group", "settings": {
       "content_direction": "column", "vertical_on_mobile": True, "horizontal_alignment": "flex-start",
       "vertical_alignment": "center", "align_baseline": False, "horizontal_alignment_flex_direction_column": "flex-start",
       "vertical_alignment_flex_direction_column": "center", "gap": 10, "width": "fill", "custom_width": 100,
       "width_mobile": "fill", "custom_width_mobile": 100, "height": "fit", "custom_height": 100,
       "background_media": "none", "video_position": "cover", "background_image_position": "cover",
       "border": "none", "border_width": 1, "border_opacity": 100, "border_radius": 0, "toggle_overlay": False,
       "overlay_color": "#00000026", "overlay_style": "solid", "gradient_direction": "to top",
       "open_in_new_tab": False, "padding-block-start": 0, "padding-block-end": 0,
       "padding-inline-start": 0, "padding-inline-end": 0},
     "blocks": {
      "text_LWt8Pz": text_block("<h2>Newsletter</h2>", "h6"),
      "text_f9CFLH": text_block("<p>Be the first to know about drops, new releases, and exclusive access.</p>", "rte"),
     },
     "block_order": ["text_LWt8Pz", "text_f9CFLH"]},
    "email_signup_crihX7": {"type": "email-signup", "settings": {
       "width": "fill", "custom_width": 100, "heading_preset": "h3", "border_style": "all", "input_style": "custom",
       "border_width": 1, "border_radius": 100, "input_background_color": "rgba(0,0,0,0)",
       "input_text_color": P % "foreground", "input_border_color": P % "foreground",
       "input_type_preset": "paragraph", "style_class": "button-unstyled", "display_type": "arrow",
       "label": "Sign up", "integrated_button": True, "button_type_preset": "paragraph",
       "padding-block-start": 0, "padding-block-end": 0, "padding-inline-start": 0, "padding-inline-end": 0},
     "blocks": {}},
    "image_signature": {"type": "image", "settings": {
       "image": "shopify://shop_images/bad-era-primary-white.png", "image_ratio": "adapt",
       "width": "fill", "custom_width": 100, "width_mobile": "fill", "custom_width_mobile": 100, "height": "fit",
       "border": "none", "border_width": 1, "border_opacity": 100, "border_radius": 0,
       "padding-block-start": 24, "padding-block-end": 0, "padding-inline-start": 0, "padding-inline-end": 0},
     "blocks": {}}},
   "block_order": ["group_H6VpwJ", "email_signup_crihX7", "image_signature"],
   "name": "t:names.footer",
   "settings": {"section_width": "page-width", "gap": 28, "background_color": "#2d2d2d",
                "padding-block-start": 72, "padding-block-end": 48},
   "custom_css": [
     ".section-background {background-image: radial-gradient(120% 70% at 14% 0%, rgb(255 255 255 / 0.09), rgb(255 255 255 / 0) 62%), linear-gradient(180deg, rgb(0 0 0 / 0) 52%, rgb(0 0 0 / 0.3)), var(--bad-era-cement, none); background-size: auto, auto, cover; background-position: 0 0, 0 0, center; background-repeat: no-repeat;}",
     "@media (min-aspect-ratio: 1/1) {.section-background {background-image: radial-gradient(120% 70% at 14% 0%, rgb(255 255 255 / 0.09), rgb(255 255 255 / 0) 62%), linear-gradient(180deg, rgb(0 0 0 / 0) 52%, rgb(0 0 0 / 0.3)), var(--bad-era-cement-wide, none);}}",
     ".section-background::after {" + seam + "}"
   ]},
  "footer_utilities_jLGE8U": {
   "type": "footer-utilities",
   "blocks": {
    "footer_copyright_jweRK8": {"type": "footer-copyright", "settings": {"show_powered_by": False, "font_size": "0.75rem", "case": "uppercase"}, "blocks": {}},
    "footer_policy_list_VCdnpa": {"type": "footer-policy-list", "settings": {"font_size": "0.75rem", "case": "uppercase"}, "blocks": {}},
    "social_links_Ew63Kq": {"type": "social-links", "settings": {"facebook_url": "", "instagram_url": "", "youtube_url": "", "tiktok_url": "", "twitter_url": ""}, "blocks": {}}},
   "block_order": ["footer_copyright_jweRK8", "footer_policy_list_VCdnpa", "social_links_Ew63Kq"],
   "name": "t:names.utilities",
   "settings": {"section_width": "page-width", "gap": 24, "divider_thickness": 0, "divider_color": P % "color2",
                "background_color": "#000000", "padding-block-start": 20, "padding-block-end": 40}}},
 "order": ["footer_m9NzUG", "footer_utilities_jLGE8U"]}
pathlib.Path("sections/footer-group.json").write_text(HEADER + json.dumps(footer, indent=2) + "\n")
print("ok")
