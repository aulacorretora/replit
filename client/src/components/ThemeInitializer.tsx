import { useThemeSetup } from "@/hooks/use-theme";

export function ThemeInitializer() {
  // Isso vai garantir que o tema escuro seja aplicado na inicialização da aplicação
  useThemeSetup();
  
  // Este componente não renderiza nada visualmente
  return null;
}