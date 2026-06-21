import { useState, useEffect } from "react";
import { UserCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientProfile } from "@/types/shop";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  profile: ClientProfile | null;
  onUpdate: (profile: ClientProfile) => void;
};

export function ChatProfile({ profile, onUpdate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  
  const [age, setAge] = useState(profile?.age?.toString() || "");
  const [skinType, setSkinType] = useState(profile?.skin_type || "");
  const [allergies, setAllergies] = useState(profile?.allergies?.join(", ") || "");
  const [climate, setClimate] = useState(profile?.climate || "");

  useEffect(() => {
    // If no profile exists at all, auto-open the panel so they see it
    if (!profile && !isOpen) {
      setIsOpen(true);
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const allergyList = allergies
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const newProfile: ClientProfile = {
      age: age ? parseInt(age) : undefined,
      skin_type: skinType || undefined,
      allergies: allergyList.length > 0 ? allergyList : undefined,
      climate: climate || undefined,
    };

    onUpdate(newProfile);
    setIsOpen(false);
  };

  return (
    <motion.div 
      layout
      className="mb-4 shrink-0 rounded-2xl border border-border/40 bg-white/60 backdrop-blur-md shadow-sm z-10 relative overflow-hidden transition-colors hover:bg-white/70"
    >
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-2xl"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCircle2 className="w-4 h-4" />
          </div>
          <span>Mi Perfil {profile ? "(Guardado)" : "(Recomendado para mejores respuestas)"}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <ChevronDown className="w-4 h-4 opacity-50" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="px-4 pb-4 grid gap-4 pt-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="age" className="text-xs font-semibold text-muted-foreground">Edad</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Ej: 32"
                    className="h-9 text-sm rounded-lg"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="skinType" className="text-xs font-semibold text-muted-foreground">Piel</Label>
                  <select
                    id="skinType"
                    value={skinType}
                    onChange={(e) => setSkinType(e.target.value)}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-shadow"
                  >
                    <option value="">Selecciona...</option>
                    <option value="seca">Seca</option>
                    <option value="grasa">Grasa</option>
                    <option value="mixta">Mixta</option>
                    <option value="sensible">Sensible</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="allergies" className="text-xs font-semibold text-muted-foreground">Condiciones médicas o alergias</Label>
                <Input
                  id="allergies"
                  placeholder="Ej: Estoy embarazada, tengo rosácea, alergia al retinol..."
                  className="h-9 text-sm rounded-lg"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="climate" className="text-xs font-semibold text-muted-foreground">Clima habitual</Label>
                <select
                  id="climate"
                  value={climate}
                  onChange={(e) => setClimate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-shadow"
                >
                  <option value="">Selecciona...</option>
                  <option value="seco">Seco</option>
                  <option value="humedo">Húmedo</option>
                  <option value="frio">Frío extremo</option>
                  <option value="calido">Cálido / Tropical</option>
                </select>
              </div>

              <Button type="submit" size="sm" className="w-full mt-2 h-9 rounded-lg font-medium transition-all active:scale-[0.98]">
                Guardar Perfil
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
