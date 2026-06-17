import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientProfile } from "@/types/shop";

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
    <div className="border-b bg-white/40 backdrop-blur-sm z-10 relative">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <UserCircle2 className="w-4 h-4 text-primary" />
          <span>Mi Perfil {profile ? "(Guardado)" : "(Recomendado para mejores respuestas)"}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 pt-1 grid gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="age" className="text-xs">Edad</Label>
              <Input
                id="age"
                type="number"
                placeholder="Ej: 32"
                className="h-8 text-sm"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="skinType" className="text-xs">Piel</Label>
              <select
                id="skinType"
                value={skinType}
                onChange={(e) => setSkinType(e.target.value)}
                className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
            <Label htmlFor="allergies" className="text-xs">Alergias o ingredientes a evitar</Label>
            <Input
              id="allergies"
              placeholder="Ej: fragancias, nueces, retinol"
              className="h-8 text-sm"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="climate" className="text-xs">Clima habitual</Label>
            <select
              id="climate"
              value={climate}
              onChange={(e) => setClimate(e.target.value)}
              className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Selecciona...</option>
              <option value="seco">Seco</option>
              <option value="humedo">Húmedo</option>
              <option value="frio">Frío extremo</option>
              <option value="calido">Cálido / Tropical</option>
            </select>
          </div>

          <Button type="submit" size="sm" className="w-full mt-1">
            Guardar Perfil
          </Button>
        </form>
      )}
    </div>
  );
}
