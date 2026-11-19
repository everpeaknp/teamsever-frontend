"use client";

import React from "react";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface ColorPickerProps {
  currentColor?: string;
  onColorChange: (color: string) => void;
  trigger: React.ReactNode;
  disabled?: boolean;
}

const COLOR_SWATCHES = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Gray", value: "#6b7280" },
  { name: "Brown", value: "#92400e" },
  { name: "Black", value: "#1f2937" },
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  currentColor,
  onColorChange,
  trigger,
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);

  const handleColorSelect = (color: string) => {
    onColorChange(color);
    setOpen(false);
  };

  const handleReset = () => {
    onColorChange("#3b82f6"); // Reset to default
    setOpen(false);
  };

  if (disabled) {
    return <>{trigger}</>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-3" align="start">
        <div className="space-y-3">
          <div className="text-sm font-medium">Choose color</div>
          <div className="grid grid-cols-6 gap-2">
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch.value}
                type="button"
                onClick={() => handleColorSelect(swatch.value)}
                className="relative w-8 h-8 rounded-md border-2 border-transparent hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-all"
                style={{ backgroundColor: swatch.value }}
                title={swatch.name}
              >
                {currentColor?.toLowerCase() === swatch.value.toLowerCase() && (
                  <Check
                    size={16}
                    className="absolute inset-0 m-auto text-white drop-shadow"
                    style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))" }}
                  />
                )}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleReset}
          >
            Reset to default
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
