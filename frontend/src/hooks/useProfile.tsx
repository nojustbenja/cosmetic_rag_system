import { useState } from "react";

export type ShopperProfile = {
  budget?: string;
  style?: string;
  interests?: string[];
};

export function useProfile() {
  const [profile, setProfile] = useState<ShopperProfile>({
    interests: [],
  });
  return { profile, setProfile };
}
