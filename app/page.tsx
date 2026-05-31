import { MODELS, BELTS, BUCKLES } from "@/lib/data";
import { Picker } from "./picker";

export default function Home() {
  return <Picker models={MODELS} belts={BELTS} buckles={BUCKLES} />;
}
