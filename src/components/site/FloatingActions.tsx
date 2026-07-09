import { useEffect, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";

export function FloatingActions() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2.5">
      <a
        href="https://wa.me/919800000000"
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className="h-12 w-12 grid place-items-center rounded-full bg-[#25D366] text-foreground shadow-elegant hover:scale-105 transition"
      >
        <MessageCircle className="h-5 w-5" />
      </a>
      {show && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="h-12 w-12 grid place-items-center rounded-full gradient-primary text-primary-foreground shadow-elegant hover:scale-105 transition"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
