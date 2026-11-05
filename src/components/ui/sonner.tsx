import { useEffect, useState } from "react";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// O tema vem da classe `dark` no <html> (quem a alterna é o shell do
// gerenciador), sem o next-themes do Besser Talk.
function useTemaDoDocumento(): ToasterProps["theme"] {
  const ler = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");
  const [tema, setTema] = useState<ToasterProps["theme"]>(ler);
  useEffect(() => {
    const observador = new MutationObserver(() => setTema(ler()));
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observador.disconnect();
  }, []);
  return tema;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useTemaDoDocumento();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
