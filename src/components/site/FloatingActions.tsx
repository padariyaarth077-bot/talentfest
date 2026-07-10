import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d="M16.02 3.2A12.73 12.73 0 0 0 5.1 22.47L3.68 28.8l6.48-1.55A12.7 12.7 0 1 0 16.02 3.2Zm0 2.38a10.32 10.32 0 0 1 8.76 15.77 10.3 10.3 0 0 1-13.86 3.62l-.44-.26-3.7.88.8-3.6-.28-.46A10.33 10.33 0 0 1 16.02 5.58Zm-5.1 5.52c-.23 0-.6.09-.92.44-.32.35-1.2 1.17-1.2 2.86 0 1.68 1.23 3.31 1.4 3.54.17.23 2.37 3.8 5.85 5.18 2.9 1.15 3.49.92 4.12.86.63-.06 2.04-.83 2.33-1.64.29-.8.29-1.49.2-1.64-.08-.14-.32-.23-.66-.4-.35-.17-2.04-1-2.36-1.12-.32-.12-.55-.17-.78.17-.23.35-.9 1.12-1.1 1.35-.2.23-.4.26-.75.09-.34-.17-1.45-.54-2.77-1.71-1.02-.91-1.72-2.04-1.92-2.38-.2-.35-.02-.54.15-.71.16-.15.35-.4.52-.6.17-.2.23-.35.35-.58.11-.23.06-.43-.03-.6-.09-.17-.78-1.87-1.07-2.56-.28-.67-.57-.58-.78-.59h-.66Z" />
    </svg>
  );
}

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
        className="h-12 w-12 grid place-items-center rounded-full bg-[#25D366] text-white shadow-elegant hover:scale-105 transition"
      >
        <WhatsAppIcon />
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
