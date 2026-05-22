import { useEffect, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useProfile } from "@/hooks/useProfile";
import { X, Printer, Sparkles, RefreshCw } from "lucide-react";
import { formatCLP } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";

import { createOrder } from "@/lib/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function ReceiptModal({ isOpen, onClose }: Props) {
  const { items, total, clear } = useCart();
  const { profile } = useProfile();
  const [ticketNumber, setTicketNumber] = useState("");
  const [timestamp, setTimestamp] = useState("");

  // Generar datos únicos del ticket una vez cuando se abre
  useEffect(() => {
    if (isOpen) {
      const randNum = Math.floor(100000 + Math.random() * 900000);
      setTicketNumber(`LM-${randNum}`);
      
      const now = new Date();
      setTimestamp(
        now.toLocaleDateString("es-CL", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }
  }, [isOpen]);

  // Registrar la orden en el Back Office cuando se genere el ticket
  useEffect(() => {
    if (isOpen && ticketNumber && timestamp && items.length > 0) {
      const orderData = {
        ticket_number: ticketNumber,
        timestamp: timestamp,
        client_name: profile?.name || "CLIENTE GENERAL",
        skin_type: profile?.skin_type || "",
        items: items.map((i) => ({
          id: i.product.id,
          name: i.product.name,
          qty: i.qty,
          price: i.product.price,
          brand: i.product.brand,
        })),
        total: total,
        status: "pendiente",
      };
      
      createOrder(orderData)
        .then(() => {
          console.log("Orden registrada con éxito en el Back Office.");
        })
        .catch((err) => {
          console.error("Error al registrar la orden en el Back Office:", err);
        });
    }
  }, [isOpen, ticketNumber, timestamp]);


  const handlePrint = () => {
    window.print();
    // Limpiar carrito y cerrar el modal después de imprimir
    setTimeout(() => {
      clear();
      onClose();
    }, 300);
  };

  const handleNewConsultation = () => {
    clear();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:static print:overflow-visible">
        {/* Backdrop - se oculta en impresión */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-foreground/30 backdrop-blur-md print:hidden"
          onClick={onClose}
        />

        {/* Modal Wrapper */}
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 15, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-md my-8 flex flex-col items-center gap-6 print:my-0 print:w-full print:max-w-none print:shadow-none print:bg-transparent print:static"
        >
          {/* BOTONES DE ACCIÓN SUPERIORES (en pantalla) */}
          <div className="flex justify-between items-center w-full max-w-[340px] px-2 print:hidden">
            <span className="text-eyebrow text-white drop-shadow-sm">Ticket de Recepción</span>
            <button
              onClick={onClose}
              aria-label="Cerrar vista de ticket"
              className="size-9 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center hover:bg-background transition shadow-sm text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* TICKET FÍSICO SIMULADO */}
          <div 
            id="lumi-receipt-ticket"
            className="w-full max-w-[340px] bg-[#FAF8F5] text-stone-900 px-6 py-8 flex flex-col font-mono shadow-2xl relative border-y-8 border-stone-200/50 print:border-none print:shadow-none print:px-0 print:py-4 print:mx-auto print:max-w-[80mm] print:bg-white"
            style={{
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 40px rgba(0,0,0,0.03) inset"
            }}
          >
            {/* Efecto de borde dentado superior en pantalla */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-repeat-x print:hidden"
                 style={{
                   backgroundImage: "linear-gradient(-45deg, transparent 4px, #FAF8F5 4px), linear-gradient(45deg, transparent 4px, #FAF8F5 4px)",
                   backgroundSize: "8px 8px",
                   transform: "translateY(-8px)"
                 }}
            />

            {/* CABECERA TICKET */}
            <div className="flex flex-col items-center text-center gap-2 mb-6 border-b border-dashed border-stone-400 pb-5">
              <span className="text-xl font-bold tracking-wider text-stone-950 flex items-center gap-1.5 justify-center">
                ✦ L U M I ✦
              </span>
              <span className="text-[10px] tracking-[0.15em] text-stone-500 uppercase font-sans font-bold">
                Asesora Digital de Belleza
              </span>
              <div className="text-[11px] text-stone-600 mt-2 flex flex-col leading-relaxed font-sans">
                <span>RAG AI BEAUTY SYSTEM</span>
                <span>TALLER DE INNOVACIÓN</span>
                <span className="mt-1 text-stone-500 font-mono text-[10px]">TICKET DE RECEPCIÓN</span>
              </div>
            </div>

            {/* DETALLES DE SESIÓN */}
            <div className="text-[11px] text-stone-600 space-y-1 mb-5 border-b border-dashed border-stone-300 pb-4">
              <div className="flex justify-between">
                <span>TICKET:</span>
                <span className="font-bold text-stone-900">{ticketNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>FECHA:</span>
                <span>{timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span>CLIENTE:</span>
                <span className="font-bold text-stone-900 truncate max-w-[180px] text-right">
                  {profile?.name || "CLIENTE GENERAL"}
                </span>
              </div>
              {profile?.skin_type && (
                <div className="flex justify-between">
                  <span>TIPO PIEL:</span>
                  <span className="uppercase">{profile.skin_type}</span>
                </div>
              )}
            </div>

            {/* LISTA DE PRODUCTOS */}
            <div className="flex flex-col mb-5 border-b border-dashed border-stone-400 pb-4 flex-1">
              <div className="flex justify-between text-[11px] font-bold text-stone-900 border-b border-stone-300 pb-1.5 mb-2 font-sans">
                <span>DESCRIPCIÓN</span>
                <span>TOTAL</span>
              </div>
              
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-start gap-2 text-[11px] leading-tight">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-stone-900 font-bold truncate">
                        {item.product.name.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        #{item.product.id}
                      </span>
                    </div>
                    <div className="text-right shrink-0 font-mono text-stone-900 font-bold">
                      {item.qty} × {formatCLP(item.product.price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TOTAL */}
            <div className="flex justify-between items-center text-stone-950 font-bold border-b border-dashed border-stone-400 pb-4 mb-5">
              <span className="text-[12px]">TOTAL A PAGAR</span>
              <span className="text-lg tracking-tight">{formatCLP(total)}</span>
            </div>

            {/* MENSAJE DE RECEPCIÓN / INSTRUCCIONES */}
            <div className="text-center bg-stone-200/50 p-3 rounded-lg border border-stone-300/30 mb-6 font-sans text-[11px] leading-relaxed text-stone-700 print:bg-stone-100 print:border-stone-400">
              <p className="font-bold text-stone-950 mb-1">PROTOTIPO EXPERIMENTAL</p>
              <p>Presenta este ticket impreso en recepción para retirar tu pedido.</p>
            </div>

            {/* BARCODE GENERADO CON SVG */}
            <div className="flex flex-col items-center gap-1.5 mt-2">
              <svg viewBox="0 0 100 24" className="w-full max-w-[200px] h-10 text-stone-950 fill-current">
                {/* Dibujar barras realistas de diferente grosor */}
                <rect x="5" y="0" width="1.5" height="24" />
                <rect x="8" y="0" width="0.8" height="24" />
                <rect x="10.5" y="0" width="3" height="24" />
                <rect x="15" y="0" width="0.8" height="24" />
                <rect x="17" y="0" width="1.5" height="24" />
                <rect x="20" y="0" width="0.8" height="24" />
                <rect x="22" y="0" width="4" height="24" />
                <rect x="28" y="0" width="1.5" height="24" />
                <rect x="31" y="0" width="0.8" height="24" />
                <rect x="33.5" y="0" width="2" height="24" />
                <rect x="37" y="0" width="0.8" height="24" />
                <rect x="39" y="0" width="1.5" height="24" />
                <rect x="42" y="0" width="4.5" height="24" />
                <rect x="48" y="0" width="0.8" height="24" />
                <rect x="50" y="0" width="1.5" height="24" />
                <rect x="53" y="0" width="3" height="24" />
                <rect x="57.5" y="0" width="0.8" height="24" />
                <rect x="59.5" y="0" width="1.5" height="24" />
                <rect x="62.5" y="0" width="4" height="24" />
                <rect x="68" y="0" width="0.8" height="24" />
                <rect x="70.5" y="0" width="2" height="24" />
                <rect x="74" y="0" width="1.5" height="24" />
                <rect x="77" y="0" width="0.8" height="24" />
                <rect x="79.5" y="0" width="3.5" height="24" />
                <rect x="85" y="0" width="0.8" height="24" />
                <rect x="87.5" y="0" width="1.5" height="24" />
                <rect x="90" y="0" width="0.8" height="24" />
                <rect x="92" y="0" width="3" height="24" />
              </svg>
              <span className="text-[10px] text-stone-500 tracking-[0.2em]">{ticketNumber}</span>
            </div>

            {/* Efecto de borde dentado inferior en pantalla */}
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-repeat-x print:hidden"
                 style={{
                   backgroundImage: "linear-gradient(135deg, transparent 4px, #FAF8F5 4px), linear-gradient(-45deg, transparent 4px, #FAF8F5 4px)",
                   backgroundSize: "8px 8px",
                   transform: "translateY(8px)"
                 }}
            />
          </div>

          {/* BOTONES DE ACCIÓN INFERIORES (en pantalla) */}
          <div className="flex flex-col gap-3 w-full max-w-[340px] px-1 print:hidden">
            <button
              onClick={handlePrint}
              className="w-full bg-foreground text-background rounded-full py-4 text-cta hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-lg"
            >
              <Printer className="size-4" />
              <span>Imprimir Ticket de Compra</span>
            </button>
            <button
              onClick={handleNewConsultation}
              className="w-full bg-background/40 hover:bg-background/60 text-foreground border border-foreground/15 rounded-full py-3.5 text-cta active:scale-[0.98] transition flex items-center justify-center gap-2 backdrop-blur-md"
            >
              <RefreshCw className="size-3.5 animate-spin-slow" />
              <span>Nueva Consulta (Limpiar)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
