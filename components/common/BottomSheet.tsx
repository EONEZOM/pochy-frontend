"use client";

import * as React from "react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerDescription, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerTrigger 
} from "@/components/ui/drawer";

interface BottomSheetProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function BottomSheet({ trigger, children, title, description }: BottomSheetProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        {trigger}
      </DrawerTrigger>
      <DrawerContent className="max-w-[480px] mx-auto">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-left px-6">
            {title && <DrawerTitle className="text-xl font-bold">{title}</DrawerTitle>}
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="px-6 pb-10">
            {children}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}