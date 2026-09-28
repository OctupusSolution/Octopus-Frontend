// The Public Link catalogue sends label keys (e.g. "sections.hero.fields.title"),
// not text. These are the merchant-facing words for the keys it ships today;
// an unknown key falls back to a humanized form of its last segment.
type Pair = readonly [ar: string, en: string];

const TEXT: Record<string, Pair> = {
  "sections.hero.name": ["قسم الواجهة", "Hero"],
  "sections.hero.fields.title": ["العنوان", "Title"],
  "sections.hero.fields.subtitle": ["العنوان الفرعي", "Subtitle"],
  "sections.hero.fields.background": ["الخلفية", "Background"],
  "sections.hero.fields.primaryAction": ["الزر الرئيسي", "Primary button"],
  "sections.hero.fields.showOverlay": ["تعتيم الخلفية", "Darken background"],
  "sections.hero.variants.centered": ["في المنتصف", "Centered"],
  "sections.hero.variants.fullscreen": ["ملء الشاشة", "Full screen"],
  "sections.hero.variants.split": ["مقسوم", "Split"],
  "sections.about.name": ["من نحن", "About"],
  "sections.about.fields.title": ["العنوان", "Title"],
  "sections.about.fields.body": ["النص", "Text"],
  "sections.about.fields.image": ["الصورة", "Image"],
  "sections.about.variants.imageLeft": ["الصورة على اليسار", "Image left"],
  "sections.about.variants.imageRight": ["الصورة على اليمين", "Image right"],
  "sections.text.name": ["نص", "Text"],
  "sections.text.fields.title": ["العنوان", "Title"],
  "sections.text.fields.body": ["النص", "Text"],
  "sections.text.variants.narrow": ["ضيق", "Narrow"],
  "sections.text.variants.wide": ["عريض", "Wide"],
  "sections.contact.name": ["تواصل معنا", "Contact"],
  "sections.contact.fields.title": ["العنوان", "Title"],
  "sections.contact.fields.address": ["العنوان البريدي", "Address"],
  "sections.contact.fields.email": ["البريد الإلكتروني", "Email"],
  "sections.contact.fields.hours": ["ساعات العمل", "Opening hours"],
  "sections.contact.fields.phone": ["الهاتف", "Phone"],
  "sections.contact.variants.card": ["بطاقة", "Card"],
  "sections.contact.variants.split": ["مقسوم", "Split"],
  "sections.cta.name": ["دعوة لإجراء", "Call to action"],
  "sections.cta.fields.title": ["العنوان", "Title"],
  "sections.cta.fields.body": ["النص", "Text"],
  "sections.cta.fields.action": ["الزر", "Button"],
  "sections.cta.variants.banner": ["شريط", "Banner"],
  "sections.cta.variants.card": ["بطاقة", "Card"],
  "sections.gallery.name": ["معرض الصور", "Gallery"],
  "sections.gallery.fields.title": ["العنوان", "Title"],
  "sections.gallery.fields.items": ["الصور", "Images"],
  "sections.gallery.fields.image": ["الصورة", "Image"],
  "sections.gallery.fields.caption": ["التعليق", "Caption"],
  "sections.gallery.variants.grid": ["شبكة", "Grid"],
  "sections.gallery.variants.masonry": ["فسيفساء", "Masonry"],
  "sections.testimonials.name": ["آراء العملاء", "Testimonials"],
  "sections.testimonials.fields.title": ["العنوان", "Title"],
  "sections.testimonials.fields.items": ["الآراء", "Testimonials"],
  "sections.testimonials.fields.quote": ["الرأي", "Quote"],
  "sections.testimonials.fields.author": ["الاسم", "Name"],
  "sections.testimonials.fields.photo": ["الصورة", "Photo"],
  "sections.testimonials.variants.cards": ["بطاقات", "Cards"],
  "sections.testimonials.variants.carousel": ["شريط متحرك", "Carousel"],
  "sections.socialFeed.name": ["خلاصة إنستغرام", "Social feed"],
  "sections.socialFeed.fields.title": ["العنوان", "Title"],
  "sections.socialFeed.fields.profile": ["الحساب", "Profile"],
  "sections.socialFeed.variants.grid": ["شبكة", "Grid"],
  "sections.socialFeed.variants.list": ["قائمة", "List"],
  "templates.home.name": ["الرئيسية", "Home"],
  "templates.blank.name": ["صفحة فارغة", "Blank page"],
  "templates.about.name": ["من نحن", "About us"],
  "templates.contact.name": ["تواصل معنا", "Contact us"],
  "templates.gallery.name": ["المعرض", "Gallery"],
  "templates.legal.name": ["الشروط والأحكام", "Terms & conditions"],
  "themes.default.name": ["الافتراضي", "Default"],
  "themes.warm.name": ["دافئ", "Warm"],
  "themes.midnight.name": ["منتصف الليل", "Midnight"],
  "social.facebook": ["فيسبوك", "Facebook"],
  "social.instagram": ["إنستغرام", "Instagram"],
  "social.linkedin": ["لينكدإن", "LinkedIn"],
  "social.snapchat": ["سناب شات", "Snapchat"],
  "social.tiktok": ["تيك توك", "TikTok"],
  "social.whatsapp": ["واتساب", "WhatsApp"],
  "social.x": ["إكس", "X"],
  "social.youtube": ["يوتيوب", "YouTube"],
};

function currentLocale(): "ar" | "en" {
  if (typeof document === "undefined") return "en";
  return document.documentElement.lang?.startsWith("ar") ? "ar" : "en";
}

/** The text for a catalogue label key, or null when the key is not known here. */
export function catalogueText(key: string, locale: string = currentLocale()): string | null {
  const pair = TEXT[key];
  return pair ? pair[locale === "ar" ? 0 : 1] : null;
}
