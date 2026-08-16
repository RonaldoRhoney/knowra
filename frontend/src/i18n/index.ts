import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";

export const IDIOMAS = [
  { codigo: "pt", nome: "Português", bandeira: "🇧🇷" },
  { codigo: "en", nome: "English", bandeira: "🇺🇸" },
  { codigo: "es", nome: "Español", bandeira: "🇪🇸" },
] as const;

const CHAVE_STORAGE = "knowra_idioma";

function idiomaInicial(): string {
  const salvo = localStorage.getItem(CHAVE_STORAGE);
  if (salvo && IDIOMAS.some((i) => i.codigo === salvo)) return salvo;
  return "pt";
}

i18n.use(initReactI18next).init({
  resources: { pt: { translation: pt }, en: { translation: en }, es: { translation: es } },
  lng: idiomaInicial(),
  fallbackLng: "pt",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => localStorage.setItem(CHAVE_STORAGE, lng));

export default i18n;
